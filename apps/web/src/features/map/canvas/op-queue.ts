// Autosave queue (FR-5). Pure (no React): enqueue MapOps, coalesce consecutive moves, debounce, send in order
// in chunks of ≤ 200, retry with backoff on network/5xx, drop a batch the API rejects (4xx), persist per board.
import { z } from 'zod';
import { mapOpSchema, type ErrorCode, type MapOp, type Result } from '@remoa/contracts';

export const CHUNK = 200;
export const DEBOUNCE_MS = 800;
const MAX_BACKOFF_MS = 30_000;
/** Error codes worth retrying (5xx, rate limit, expired token that the Supabase client refreshes). */
const RETRYABLE = new Set<ErrorCode>(['internal', 'ai_unavailable', 'rate_limited', 'unauthorized']);

export type SaveState = 'saved' | 'saving' | 'offline' | 'error';
/** `dropped`: the API rejected a batch (4xx); local state may differ from the server until reload. */
export type QueueStatus = { state: SaveState; savedAt: number | null; pending: number; dropped: boolean };
export type SendOps = (ops: MapOp[]) => Promise<Result<{ applied: string[] }>>;
type KV = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
type Events = Pick<Window, 'addEventListener' | 'removeEventListener'>;

export type OpQueueOptions = {
  boardId: string;
  send: SendOps;
  onStatus?: (s: QueueStatus) => void;
  storage?: KV | null;
  events?: Events | null;
  debounceMs?: number;
  now?: () => number;
};

export const storageKey = (boardId: string) => `remoa:map-ops:${boardId}`;

/** Ops left in storage by a previous session (reload while offline). Invalid data is ignored. */
export function loadPending(boardId: string, storage: KV | null | undefined): MapOp[] {
  try {
    const raw = storage?.getItem(storageKey(boardId));
    const parsed = z.array(mapOpSchema).safeParse(raw ? JSON.parse(raw) : []);
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}

/** Appends `op`, merging it into the last op when both are moves (positions are absolute, so the newest wins). */
export function coalesce(queue: MapOp[], op: MapOp, from = 0): MapOp[] {
  const last = queue.at(-1);
  if (op.op !== 'moveCards' || last?.op !== 'moveCards' || queue.length <= from) return [...queue, op];
  const moves = new Map(last.moves.map((m) => [m.cardId, m.position]));
  for (const m of op.moves) moves.set(m.cardId, m.position);
  // New opId: `last` may already have reached the server in a batch whose response was lost.
  const merged: MapOp = { ...op, moves: [...moves].map(([cardId, position]) => ({ cardId, position })) };
  return [...queue.slice(0, -1), merged];
}

export function createOpQueue(o: OpQueueOptions) {
  const storage = o.storage ?? null;
  const now = o.now ?? Date.now;
  const debounceMs = o.debounceMs ?? DEBOUNCE_MS;
  let queue = loadPending(o.boardId, storage);
  let inflight = 0;
  let acked = 0; // batches the API answered (applied or rejected)
  let attempt = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let offline = false;
  let error: 'retry' | 'dropped' | null = null;
  let savedAt: number | null = null;
  let disposed = false;

  const status = (): QueueStatus => ({
    state: error ? 'error' : offline ? 'offline' : queue.length ? 'saving' : 'saved',
    savedAt,
    pending: queue.length,
    dropped: error === 'dropped',
  });
  const emit = () => {
    if (!disposed) o.onStatus?.(status());
  };
  const persist = () => {
    try {
      if (queue.length) storage?.setItem(storageKey(o.boardId), JSON.stringify(queue));
      else storage?.removeItem(storageKey(o.boardId));
    } catch {
      // storage full or blocked: the in-memory queue still saves while the tab is open
    }
  };
  const schedule = (ms: number) => {
    clearTimeout(timer);
    if (!disposed) timer = setTimeout(() => void flush(), ms);
  };
  const backoff = () => schedule(Math.min(MAX_BACKOFF_MS, 1000 * 2 ** attempt++));

  let running: Promise<void> | null = null;
  /** Sends now. A call while a batch is in flight waits for that send instead of returning early. */
  function flush(): Promise<void> {
    clearTimeout(timer);
    running ??= send().finally(() => (running = null));
    return running;
  }

  async function send(): Promise<void> {
    if (disposed || !queue.length) return;
    const batch = queue.slice(0, CHUNK);
    inflight = batch.length;
    emit();
    let r: Awaited<ReturnType<SendOps>>;
    try {
      r = await o.send(batch);
    } catch {
      inflight = 0;
      offline = true;
      emit();
      backoff();
      return;
    }
    inflight = 0;
    offline = false;
    if (r.ok || !RETRYABLE.has(r.error.code)) {
      queue = queue.slice(batch.length);
      acked++;
      persist();
      attempt = 0;
      if (r.ok) {
        savedAt = now();
        if (error === 'retry') error = null;
      } else error = 'dropped';
      emit();
      if (queue.length) return send();
      return;
    }
    error = 'retry';
    emit();
    backoff();
  }

  const onOnline = () => {
    attempt = 0;
    void flush();
  };
  o.events?.addEventListener('online', onOnline);
  if (queue.length) schedule(0);

  return {
    /** Ops restored from storage at creation (apply them to the local graph). */
    restored: [...queue],
    enqueue(ops: MapOp[]) {
      for (const op of ops) queue = coalesce(queue, op, inflight);
      persist();
      emit();
      if (!offline && error !== 'retry') schedule(debounceMs); // otherwise a backoff timer is already pending
    },
    flush,
    /** "Tentar de novo": send now, resetting the backoff. */
    retry() {
      attempt = 0;
      if (error === 'dropped') error = null;
      emit();
      return flush();
    },
    status,
    /**
     * Resolves true once no queued op matches `pending` (e.g. this card's createCard reached the API),
     * false if the queue is stuck (offline, retrying, disposed). F02 awaits it before the first PUT of a new card.
     */
    async sent(pending: (op: MapOp) => boolean): Promise<boolean> {
      while (queue.some(pending)) {
        const before = acked;
        await flush();
        if (disposed || offline || error === 'retry' || acked === before) return !queue.some(pending);
      }
      return true;
    },
    dispose() {
      disposed = true;
      clearTimeout(timer);
      o.events?.removeEventListener('online', onOnline);
    },
  };
}
export type OpQueue = ReturnType<typeof createOpQueue>;
