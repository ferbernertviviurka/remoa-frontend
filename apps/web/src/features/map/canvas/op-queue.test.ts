import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MapOp, Result } from '@remoa/contracts';
import { CHUNK, coalesce, createOpQueue, loadPending, storageKey, type QueueStatus, type SendOps } from './op-queue';

const boardId = '00000000-0000-4000-8000-000000000100';
let n = 0;
const id = () => `00000000-0000-4000-8000-${(++n).toString().padStart(12, '0')}`;
const card = (k: number) => `00000000-0000-4000-8000-${(9000 + k).toString().padStart(12, '0')}`;
const move = (k: number, x: number): MapOp => ({ op: 'moveCards', opId: id(), boardId, moves: [{ cardId: card(k), position: { x, y: 0 } }] });
const del = (k: number): MapOp => ({ op: 'deleteCards', opId: id(), boardId, cardIds: [card(k)] });
const okSend = (): Result<{ applied: string[] }> => ({ ok: true, data: { applied: [] } });

class MemStorage {
  m = new Map<string, string>();
  getItem = (k: string) => this.m.get(k) ?? null;
  setItem = (k: string, v: string) => void this.m.set(k, v);
  removeItem = (k: string) => void this.m.delete(k);
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

function setup(send: SendOps, storage = new MemStorage()) {
  const statuses: QueueStatus[] = [];
  const events = new EventTarget();
  const q = createOpQueue({ boardId, send, storage, events: events as unknown as Window, onStatus: (s) => statuses.push(s), now: () => 42 });
  return { q, statuses, storage, events, last: () => statuses.at(-1) };
}

describe('coalesce', () => {
  it('merges consecutive moves, newest position wins, keeps other ops apart', () => {
    let q: MapOp[] = [];
    q = coalesce(q, move(1, 10));
    q = coalesce(q, move(2, 20));
    q = coalesce(q, move(1, 30));
    expect(q).toHaveLength(1);
    expect(q[0]).toMatchObject({ moves: [{ cardId: card(1), position: { x: 30 } }, { cardId: card(2), position: { x: 20 } }] });
    q = coalesce(q, del(3));
    q = coalesce(q, move(1, 40));
    expect(q.map((o) => o.op)).toEqual(['moveCards', 'deleteCards', 'moveCards']);
  });
  it('never merges into an op already in flight', () => {
    expect(coalesce([move(1, 1)], move(1, 2), 1)).toHaveLength(2);
  });
});

describe('op queue', () => {
  it('debounces 800ms, then sends everything in one request', async () => {
    const send = vi.fn<SendOps>(async () => okSend());
    const { q, last } = setup(send);
    q.enqueue([move(1, 10)]);
    await vi.advanceTimersByTimeAsync(500);
    q.enqueue([move(1, 20), del(2)]);
    expect(last()?.state).toBe('saving');
    await vi.advanceTimersByTimeAsync(799);
    expect(send).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(send).toHaveBeenCalledOnce();
    expect(send.mock.calls[0]![0].map((o: MapOp) => o.op)).toEqual(['moveCards', 'deleteCards']);
    expect(last()).toEqual({ state: 'saved', savedAt: 42, pending: 0, dropped: false });
  });

  it('sends in order in chunks of 200', async () => {
    const send = vi.fn<SendOps>(async () => okSend());
    const { q } = setup(send);
    q.enqueue(Array.from({ length: 450 }, (_, i) => del(i)));
    await q.flush();
    expect(send.mock.calls.map((c) => c[0].length)).toEqual([CHUNK, CHUNK, 50]);
  });

  it('keeps the ops and retries with backoff when the network throws; goes offline', async () => {
    let fail = true;
    const send = vi.fn<SendOps>(async () => {
      if (fail) throw new TypeError('Failed to fetch');
      return okSend();
    });
    const { q, last, storage } = setup(send);
    q.enqueue([move(1, 10), move(2, 20), move(3, 30)]);
    await vi.advanceTimersByTimeAsync(800);
    expect(last()?.state).toBe('offline');
    expect(loadPending(boardId, storage)).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(1000); // 1st backoff
    expect(send).toHaveBeenCalledTimes(2);
    fail = false;
    await vi.advanceTimersByTimeAsync(2000); // 2nd backoff
    expect(send).toHaveBeenCalledTimes(3);
    expect(last()?.state).toBe('saved');
    expect(storage.m.has(storageKey(boardId))).toBe(false);
  });

  it('flushes right away on the online event', async () => {
    let fail = true;
    const send = vi.fn<SendOps>(async () => {
      if (fail) throw new TypeError('offline');
      return okSend();
    });
    const { q, events, last } = setup(send);
    q.enqueue([move(1, 1)]);
    await vi.advanceTimersByTimeAsync(800);
    q.enqueue([move(2, 2)]); // offline: waits, does not reset the backoff
    fail = false;
    events.dispatchEvent(new Event('online'));
    await vi.advanceTimersByTimeAsync(0);
    expect(send).toHaveBeenCalledTimes(2);
    expect(send.mock.calls[1]![0]).toHaveLength(1);
    expect(send.mock.calls[1]![0][0]).toMatchObject({ op: 'moveCards', moves: [{ cardId: card(1) }, { cardId: card(2) }] });
    expect(last()?.state).toBe('saved');
  });

  it('retries a 5xx and shows the error until it goes through', async () => {
    const send = vi
      .fn<SendOps>()
      .mockResolvedValueOnce({ ok: false, error: { code: 'internal', message: 'HTTP 500' } })
      .mockResolvedValue(okSend());
    const { q, last } = setup(send);
    q.enqueue([del(1)]);
    await vi.advanceTimersByTimeAsync(800);
    expect(last()).toMatchObject({ state: 'error', pending: 1, dropped: false });
    await q.retry();
    expect(last()).toMatchObject({ state: 'saved', pending: 0 });
  });

  it('drops a batch rejected with 4xx, surfaces the error, keeps saving later ops', async () => {
    const send = vi
      .fn<SendOps>()
      .mockResolvedValueOnce({ ok: false, error: { code: 'validation', message: 'limit' } })
      .mockResolvedValue(okSend());
    const { q, last } = setup(send);
    q.enqueue([del(1)]);
    await vi.advanceTimersByTimeAsync(800);
    expect(last()).toMatchObject({ state: 'error', pending: 0, dropped: true });
    q.enqueue([del(2)]);
    await vi.advanceTimersByTimeAsync(800);
    expect(send).toHaveBeenCalledTimes(2);
    expect(last()).toMatchObject({ state: 'error', dropped: true }); // until "Tentar de novo"
    await q.retry();
    expect(last()).toMatchObject({ state: 'saved', dropped: false });
  });

  it('restores pending ops from storage and replays them on creation', async () => {
    const storage = new MemStorage();
    const first = setup(vi.fn<SendOps>(async () => { throw new TypeError('offline'); }), storage);
    first.q.enqueue([move(1, 1), del(2)]);
    first.q.dispose();
    const send = vi.fn<SendOps>(async () => okSend());
    const second = setup(send, storage);
    expect(second.q.restored.map((o) => o.op)).toEqual(['moveCards', 'deleteCards']);
    await vi.advanceTimersByTimeAsync(0);
    expect(send).toHaveBeenCalledOnce();
    expect(second.last()?.state).toBe('saved');
  });

  it('ignores corrupted storage and survives a throwing storage', () => {
    const s = new MemStorage();
    s.setItem(storageKey(boardId), '{not json');
    expect(loadPending(boardId, s)).toEqual([]);
    s.setItem(storageKey(boardId), JSON.stringify([{ op: 'nope' }]));
    expect(loadPending(boardId, s)).toEqual([]);
    const broken = { getItem: () => null, setItem: () => { throw new Error('quota'); }, removeItem: () => undefined };
    const q = createOpQueue({ boardId, send: async () => okSend(), storage: broken });
    expect(() => q.enqueue([del(1)])).not.toThrow();
    expect(q.status().pending).toBe(1);
    q.dispose();
  });

  it('does nothing after dispose', async () => {
    const send = vi.fn<SendOps>(async () => okSend());
    const { q } = setup(send);
    q.enqueue([del(1)]);
    q.dispose();
    await vi.advanceTimersByTimeAsync(5000);
    expect(send).not.toHaveBeenCalled();
  });
});

describe('sent (F02: wait for createCard before the first PUT)', () => {
  const create = (k: number): MapOp => ({ op: 'createCard', opId: id(), boardId, card: { id: card(k), type: 'concept', title: 'x', position: { x: 0, y: 0 } } });
  const isCreate = (k: number) => (o: MapOp) => o.op === 'createCard' && o.card.id === card(k);

  it('sends right away (no debounce) and resolves true once the op is acknowledged', async () => {
    const send = vi.fn<SendOps>().mockResolvedValue(okSend());
    const { q } = setup(send);
    q.enqueue([create(1)]);
    await expect(q.sent(isCreate(1))).resolves.toBe(true);
    expect(send).toHaveBeenCalledOnce();
  });

  it('waits for a batch already in flight instead of returning early', async () => {
    let release!: () => void;
    const send = vi.fn<SendOps>().mockImplementationOnce(() => new Promise((r) => (release = () => r(okSend())))).mockResolvedValue(okSend());
    const { q } = setup(send);
    q.enqueue([create(1)]);
    void q.flush();
    let done = false;
    const p = q.sent(isCreate(1)).then((v) => (done = v));
    await Promise.resolve();
    expect(done).toBe(false);
    release();
    await p;
    expect(done).toBe(true);
  });

  it('resolves false when offline, true when nothing is pending', async () => {
    const send = vi.fn<SendOps>().mockRejectedValue(new Error('offline'));
    const { q } = setup(send);
    await expect(q.sent(isCreate(1))).resolves.toBe(true);
    q.enqueue([create(1)]);
    await expect(q.sent(isCreate(1))).resolves.toBe(false);
  });
});
