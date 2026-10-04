import type { AnswerOutput, ItemRef, RateInput, Result, SessionSummary, StartSessionInput, StartSessionOutput } from '@remoa/contracts';
import { api } from '@/lib/api';

/** Answer payload as the screen builds it; sessionId/itemId/durationMs are added by the session. */
export type AnswerPayload = { inputKind: 'self' } | { inputKind: 'mcq'; optionIndex: number } | { inputKind: 'text'; text: string } | { inputKind: 'voice'; text: string };

const post = async <T>(path: string, body: unknown, onFeedback?: (chunk: string) => void): Promise<Result<T>> => {
  try {
    const init: RequestInit = { method: 'POST', body: JSON.stringify(body) };
    if (!onFeedback) return await api<T>(`/v1/challenge/${path}`, init);
    return await api<T>(`/v1/challenge/${path}`, { ...init, headers: { accept: 'text/event-stream' } }, onFeedback);
  } catch {
    return { ok: false, error: { code: 'internal', message: 'network' } };
  }
};

const QUEUE = 'remoa-offline-answers';
const LAST = 'remoa-last-session';

type SavedSession = { kind: StartSessionInput['kind']; boardId?: string; data: StartSessionOutput };

function rememberSession(input: StartSessionInput, data: StartSessionOutput) {
  const saved: SavedSession = { kind: input.kind, boardId: input.boardId, data };
  localStorage.setItem(LAST, JSON.stringify(saved));
}

function recallSession(input: StartSessionInput): StartSessionOutput | null {
  try {
    const saved = JSON.parse(localStorage.getItem(LAST) ?? 'null') as SavedSession | null;
    if (!saved || saved.kind !== input.kind || saved.data.items.length === 0) return null;
    if (input.kind === 'board' && saved.boardId !== input.boardId) return null;
    return saved.data;
  } catch {
    return null;
  }
}

type Queued = { path: 'answer' | 'rate' | 'finish'; body: unknown };

function readQueue(): Queued[] {
  try {
    const raw = JSON.parse(localStorage.getItem(QUEUE) ?? '[]') as unknown[];
    return raw.flatMap((item) => {
      if (item && typeof item === 'object' && 'path' in item && 'body' in item) {
        const path = (item as { path: unknown }).path;
        if (path === 'answer' || path === 'rate' || path === 'finish') return [{ path, body: (item as { body: unknown }).body }];
      }
      return [{ path: 'answer' as const, body: item }];
    });
  } catch {
    return [];
  }
}

/** Keeps answers and ratings that could not reach the API. AI grading runs when they are sent again. */
export function queueOffline(body: unknown, path: 'answer' | 'rate' | 'finish' = 'answer') {
  const next = [...readQueue(), { path, body }].slice(-30);
  localStorage.setItem(QUEUE, JSON.stringify(next));
}

const offlineSlot = () => ({ due: new Date(), intervalDays: 0 });

/** Shown when the answer is stored locally: the student rates now, the server grades after reconnect. */
function offlineAnswer() {
  const slot = offlineSlot();
  return { canonical: '', verdict: null, suggestedGrade: null, gradeLocked: false, fallback: 'offline' as const, preview: { again: slot, hard: slot, good: slot, easy: slot } };
}

export async function flushOffline(trackSynced: () => void) {
  const left: Queued[] = [];
  for (const item of readQueue()) {
    const r = await post(item.path, item.body);
    if (r.ok) trackSynced();
    else if (r.error.message === 'network' || r.error.code === 'internal') left.push(item);
  }
  localStorage.setItem(QUEUE, JSON.stringify(left));
}

export const challengeClient = {
  start: async (b: StartSessionInput) => {
    const r = await post<StartSessionOutput>('start', b);
    if (r.ok) {
      rememberSession(b, r.data);
      return r;
    }
    if (r.error.message === 'network') {
      const saved = recallSession(b);
      if (saved) return { ok: true as const, data: saved };
    }
    return r;
  },
  answer: async (b: { sessionId: string; itemId: string; durationMs: number } & AnswerPayload, onFeedback?: (chunk: string) => void) => {
    const r = await post<AnswerOutput>('answer', b, onFeedback);
    if (!r.ok && r.error.message === 'network') {
      queueOffline(b, 'answer');
      return { ok: true as const, data: offlineAnswer() };
    }
    return r;
  },
  rate: async (b: RateInput) => {
    const r = await post<{ due: string | Date }>('rate', b);
    if (!r.ok && r.error.message === 'network') {
      queueOffline(b, 'rate');
      return { ok: true as const, data: { due: new Date().toISOString() } };
    }
    return r;
  },
  dispute: (b: ItemRef) => post<{ reviewItemId: string }>('dispute', b),
  skip: (b: ItemRef) => post<{ remaining: number }>('skip', b),
  finish: async (b: { sessionId: string }) => {
    const r = await post<SessionSummary>('finish', b);
    if (!r.ok && r.error.message === 'network') {
      queueOffline(b, 'finish');
      localStorage.removeItem(LAST);
    }
    if (r.ok) localStorage.removeItem(LAST);
    return r;
  },
};
