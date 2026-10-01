import type { AnswerOutput, ItemRef, RateInput, Result, SessionSummary, StartSessionInput, StartSessionOutput } from '@remoa/contracts';
import { api } from '@/lib/api';

/** Answer payload as the screen builds it; sessionId/itemId/durationMs are added by the session. */
export type AnswerPayload = { inputKind: 'self' } | { inputKind: 'mcq'; optionIndex: number } | { inputKind: 'text'; text: string };

const post = async <T>(path: string, body: unknown): Promise<Result<T>> => {
  try {
    return await api<T>(`/v1/challenge/${path}`, { method: 'POST', body: JSON.stringify(body) });
  } catch {
    return { ok: false, error: { code: 'internal', message: 'network' } }; // offline: the UI shows a retry message
  }
};

export const challengeClient = {
  start: (b: StartSessionInput) => post<StartSessionOutput>('start', b),
  answer: (b: { sessionId: string; itemId: string; durationMs: number } & AnswerPayload) => post<AnswerOutput>('answer', b),
  rate: (b: RateInput) => post<{ due: string | Date }>('rate', b),
  dispute: (b: ItemRef) => post<{ reviewItemId: string }>('dispute', b),
  skip: (b: ItemRef) => post<{ remaining: number }>('skip', b),
  finish: (b: { sessionId: string }) => post<SessionSummary>('finish', b),
};
