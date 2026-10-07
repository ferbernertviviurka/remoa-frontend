'use client';

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import type { ChallengeItemPublic, ChallengeOptions, Grade, QueueFilter, SessionSummary, StartSessionInput, StudyOrder } from '@remoa/contracts';
import { track } from '@/lib/analytics';
import { challengeClient, type AnswerPayload } from './client';

export const MAX_SKIPS = 2; // contracts MAX_SKIPS_PER_ITEM; the server is the authority (409)

export type Scope = { kind: 'daily' } | { kind: 'board'; boardId: string };
export const scopeKey = (s: Scope) => (s.kind === 'daily' ? 'daily' : s.boardId);

export type Run = { sessionId: string; items: ChallengeItemPublic[]; queue: string[]; total: number; correct: number; wrong: number; skips: Record<string, number>; toReview: string[] };
export type ChallengeState =
  | { phase: 'idle' }
  | { phase: 'loading'; scope: string }
  /** `code`: the API's error message, e.g. `challenge_min_cards` (D-579). */
  | { phase: 'error'; scope: string; code?: string }
  | { phase: 'empty'; scope: string }
  | ({ phase: 'running'; scope: string } & Run)
  | { phase: 'finishing'; scope: string; items: ChallengeItemPublic[] }
  | { phase: 'done'; scope: string; items: ChallengeItemPublic[]; summary: SessionSummary };

export type ChallengeApi = {
  state: ChallengeState;
  /** Starts a session; resolves to its first item (the daily queue starts on whatever map owns it). Without `options`, the last ones chosen ("Mais 5"). */
  begin: (scope: Scope, limit?: number, options?: ChallengeOptions, filter?: QueueFilter, studyOrder?: StudyOrder) => Promise<ChallengeItemPublic | null>;
  /** Starts a session for the scope unless one is already running/loading for it (idempotent, StrictMode safe). */
  ensure: (scope: Scope, options?: ChallengeOptions, studyOrder?: StudyOrder) => void;
  /** CCR-019: the options of the current session (gradingMode `self` = Acertei/Errei on a board session). */
  options: ChallengeOptions | null;
  reset: () => void;
  answer: (item: ChallengeItemPublic, p: AnswerPayload, durationMs: number, onFeedback?: (chunk: string) => void) => ReturnType<typeof challengeClient.answer>;
  rate: (item: ChallengeItemPublic, grade: Grade, overridden: boolean, inputKind: AnswerPayload['inputKind']) => Promise<boolean>;
  skip: (item: ChallengeItemPublic) => Promise<'ok' | 'limit' | 'error'>;
  dispute: (item: ChallengeItemPublic) => Promise<boolean>;
};

const Ctx = createContext<ChallengeApi | null>(null);
export const useChallenge = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error('useChallenge outside ChallengeProvider');
  return c;
};

/**
 * Session state for the challenge. It lives in the (app) layout, so it survives the move from one map to the next
 * (the daily queue spans boards: D-0xx G01 T6). The server keeps the items; nothing here is persisted across reloads.
 */
export function ChallengeProvider({ children }: { children: ReactNode }) {
  const [state, setStateRaw] = useState<ChallengeState>({ phase: 'idle' });
  const cur = useRef(state); // handlers read the latest state synchronously
  const setState = useCallback((s: ChallengeState) => {
    cur.current = s;
    setStateRaw(s);
  }, []);
  const startedAt = useRef(0);
  const scopeRef = useRef<Scope>({ kind: 'daily' });
  const optsRef = useRef<ChallengeOptions | undefined>(undefined);
  const studyOrderRef = useRef<StudyOrder | undefined>(undefined); // F31 FR-10: kept for "Mais 5" like the options
  const [options, setOptions] = useState<ChallengeOptions | null>(null);

  const begin = useCallback<ChallengeApi['begin']>(
    async (scope, limit, opts, filter, studyOrder) => {
      const key = scopeKey(scope);
      scopeRef.current = scope;
      if (opts) optsRef.current = opts;
      if (studyOrder) studyOrderRef.current = studyOrder;
      setState({ phase: 'loading', scope: key });
      const input: StartSessionInput = {
        kind: scope.kind,
        ...(scope.kind === 'board' ? { boardId: scope.boardId } : {}),
        ...(limit ? { limit } : {}),
        ...(scope.kind === 'daily' && filter ? { filter } : {}), // G15: Revisar starts the filtered selection
        ...(scope.kind === 'board' && optsRef.current ? { options: optsRef.current } : {}),
        ...(scope.kind === 'board' && studyOrderRef.current ? { studyOrder: studyOrderRef.current } : {}),
      };
      const r = await challengeClient.start(input);
      if (!r.ok) return void setState({ phase: 'error', scope: key, code: r.error.message }), null;
      const { sessionId, items } = r.data;
      setOptions(r.data.options ?? null);
      if (items.length === 0) return void setState({ phase: 'empty', scope: key }), null;
      startedAt.current = performance.now();
      track('challenge_started', { kind: scope.kind, items: items.length, modes: [...new Set(items.map((i) => i.mode))] });
      setState({ phase: 'running', scope: key, sessionId, items, queue: items.map((i) => i.id), total: items.length, correct: 0, wrong: 0, skips: {}, toReview: [] });
      return items[0]!;
    },
    [setState],
  );

  const ensure = useCallback<ChallengeApi['ensure']>(
    (scope, opts, studyOrder) => {
      const s = cur.current;
      // running/loading/finishing resume; an error waits for "Tentar de novo"; idle/empty/done (or another scope) start over
      if (s.phase !== 'idle' && s.scope === scopeKey(scope) && s.phase !== 'empty' && s.phase !== 'done') return;
      void begin(scope, undefined, opts, undefined, studyOrder);
    },
    [begin],
  );

  const reset = useCallback(() => setState({ phase: 'idle' }), [setState]);

  const finish = useCallback(
    async (sessionId: string, items: ChallengeItemPublic[], scope: string, tally: { correct: number; wrong: number; toReview: string[] }) => {
      setState({ phase: 'finishing', scope, items });
      const r = await challengeClient.finish({ sessionId });
      if (!r.ok && r.error.message === 'network') {
        const durationMs = Math.round(performance.now() - startedAt.current);
        track('challenge_finished', { correct: tally.correct, wrong: tally.wrong, durationMs });
        setState({
          phase: 'done',
          scope,
          items,
          summary: { sessionId, correct: tally.correct, wrong: tally.wrong, toReview: tally.toReview, nextDue: null, durationMs },
        });
        return;
      }
      if (!r.ok) return setState({ phase: 'error', scope });
      track('challenge_finished', { correct: tally.correct, wrong: tally.wrong, durationMs: Math.round(performance.now() - startedAt.current) });
      setState({ phase: 'done', scope, items, summary: r.data });
    },
    [setState],
  );

  const running = () => (cur.current.phase === 'running' ? cur.current : null);

  const answer = useCallback<ChallengeApi['answer']>(async (item, p, durationMs, onFeedback) => {
    const s = running();
    if (!s) return { ok: false, error: { code: 'conflict', message: 'no session' } };
    const t0 = performance.now();
    const r = await challengeClient.answer({ sessionId: s.sessionId, itemId: item.id, durationMs, ...p }, onFeedback);
    if (r.ok) {
      const latencyMs = Math.round(performance.now() - t0);
      track('answer_submitted', { mode: item.mode, inputKind: p.inputKind, verdict: r.data.verdict?.verdict ?? null, latencyMs });
      if (r.data.verdict) track('ai_graded', { verdict: r.data.verdict.verdict, latencyMs, costCents: r.data.verdict.costCents ?? 0, model: r.data.verdict.model.slice(0, 64) });
    }
    return r;
  }, []);

  const rate = useCallback<ChallengeApi['rate']>(
    async (item, grade, overridden, inputKind) => {
      const s = running();
      if (!s) return false;
      const r = await challengeClient.rate({ sessionId: s.sessionId, itemId: item.id, grade, overridden });
      if (!r.ok) return false;
      if (overridden) track('grade_overridden', {});
      track('review_completed', { grade, mode: item.mode, inputKind, overridden });
      const queue = s.queue.slice(1);
      const toReview = grade === 'again' ? [...s.toReview, item.cardId] : s.toReview;
      const tally = { correct: s.correct + (grade === 'again' ? 0 : 1), wrong: s.wrong + (grade === 'again' ? 1 : 0), toReview };
      if (queue.length === 0) void finish(s.sessionId, s.items, s.scope, tally);
      else setState({ ...s, queue, correct: tally.correct, wrong: tally.wrong, toReview });
      return true;
    },
    [finish, setState],
  );

  const skip = useCallback<ChallengeApi['skip']>(
    async (item) => {
      const s = running();
      if (!s) return 'error';
      const r = await challengeClient.skip({ sessionId: s.sessionId, itemId: item.id });
      if (!r.ok) {
        if (r.error.code === 'conflict') setState({ ...s, skips: { ...s.skips, [item.id]: MAX_SKIPS } });
        return r.error.code === 'conflict' ? 'limit' : 'error';
      }
      setState({ ...s, queue: [...s.queue.slice(1), item.id], skips: { ...s.skips, [item.id]: (s.skips[item.id] ?? 0) + 1 } });
      return 'ok';
    },
    [setState],
  );

  const dispute = useCallback<ChallengeApi['dispute']>(async (item) => {
    const s = running();
    if (!s) return false;
    const r = await challengeClient.dispute({ sessionId: s.sessionId, itemId: item.id });
    if (r.ok) track('answer_disputed', {});
    return r.ok;
  }, []);

  const api = useMemo(() => ({ state, options, begin, ensure, reset, answer, rate, skip, dispute }), [state, options, begin, ensure, reset, answer, rate, skip, dispute]);
  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}
