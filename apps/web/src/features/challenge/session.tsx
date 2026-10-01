'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { AnswerOutput, ChallengeItemPublic, Grade, SessionSummary } from '@remoa/contracts';
import { t } from '@remoa/strings';
import { Alert, Button, Eyebrow, Progress, Skeleton } from '@remoa/ui';
import { track } from '@/lib/analytics';
import { EmptyState } from '@/features/shell/empty-state';
import { challengeClient, type AnswerPayload } from './client';
import { ItemView } from './item-view';
import { SidePanel } from './side-panel';
import { Summary } from './summary';

const MAX_SKIPS = 2; // contracts MAX_SKIPS_PER_ITEM; the server is the authority (409)

type State =
  | { phase: 'loading' }
  | { phase: 'error' }
  | { phase: 'empty' }
  | { phase: 'running'; sessionId: string; items: ChallengeItemPublic[]; queue: string[]; total: number; correct: number; wrong: number; skips: Record<string, number> }
  | { phase: 'finishing'; sessionId: string; items: ChallengeItemPublic[] }
  | { phase: 'done'; items: ChallengeItemPublic[]; summary: SessionSummary };

type Props = { kind: 'daily' | 'board'; boardId?: string; boardTitle?: string };

/** F04 session screen: starts the session, runs the queue item by item and shows the summary. */
export function ChallengeSession({ kind, boardId, boardTitle }: Props) {
  const [state, setState] = useState<State>({ phase: 'loading' });
  const startedAt = useRef(0);
  const first = useRef(true);

  const start = useCallback(
    async (limit?: number) => {
      setState({ phase: 'loading' });
      const r = await challengeClient.start({ kind, ...(boardId ? { boardId } : {}), ...(limit ? { limit } : {}) });
      if (!r.ok) return setState({ phase: 'error' });
      const { sessionId, items } = r.data;
      if (items.length === 0) return setState({ phase: 'empty' });
      startedAt.current = performance.now();
      track('challenge_started', { kind, items: items.length, modes: [...new Set(items.map((i) => i.mode))] });
      setState({ phase: 'running', sessionId, items, queue: items.map((i) => i.id), total: items.length, correct: 0, wrong: 0, skips: {} });
    },
    [kind, boardId],
  );

  useEffect(() => {
    if (!first.current) return; // StrictMode runs effects twice; one session only
    first.current = false;
    void start();
  }, [start]);

  const finish = useCallback(async (sessionId: string, items: ChallengeItemPublic[], tally?: { correct: number; wrong: number }) => {
    setState({ phase: 'finishing', sessionId, items });
    const r = await challengeClient.finish({ sessionId });
    if (!r.ok) return setState({ phase: 'error' });
    track('challenge_finished', {
      correct: tally?.correct ?? r.data.correct,
      wrong: tally?.wrong ?? r.data.wrong,
      durationMs: Math.round(performance.now() - startedAt.current),
    });
    setState({ phase: 'done', items, summary: r.data });
  }, []);

  const heading = (
    <header className="flex flex-col gap-1">
      <Eyebrow>{kind === 'board' ? (boardTitle ?? t('vocab.board')) : t('vocab.reviewToday')}</Eyebrow>
      <h1 className="font-display text-2xl font-extrabold text-text">{kind === 'board' ? t('challenge.titleBoard') : t('challenge.titleDaily')}</h1>
    </header>
  );

  if (state.phase === 'loading' || state.phase === 'finishing')
    return (
      <div className="flex flex-col gap-6">
        {heading}
        <div role="status" aria-label={t('challenge.loading')}>
          <Skeleton lines={5} />
        </div>
      </div>
    );
  if (state.phase === 'error')
    return (
      <div className="flex flex-col gap-6">
        {heading}
        <Alert tone="review" role="alert" title={t('challenge.loadError')}>
          <Button variant="secondary" onClick={() => void start()}>
            {t('common.retry')}
          </Button>
        </Alert>
      </div>
    );
  if (state.phase === 'empty')
    return (
      <EmptyState title={t('challenge.empty.title')} body={t('challenge.empty.body')}>
        <Link href="/revisar">{t('challenge.backToReview')}</Link>
      </EmptyState>
    );
  if (state.phase === 'done')
    return (
      <div className="flex flex-col gap-6">
        {heading}
        <Summary summary={state.summary} items={state.items} onMore={() => void start(5)} />
      </div>
    );

  const s = state;
  const item = s.items.find((i) => i.id === s.queue[0])!;
  const done = s.total - s.queue.length;

  async function onAnswer(p: AnswerPayload, durationMs: number) {
    const t0 = performance.now();
    const r = await challengeClient.answer({ sessionId: s.sessionId, itemId: item.id, durationMs, ...p });
    if (r.ok) track('answer_submitted', { mode: item.mode, inputKind: p.inputKind, verdict: r.data.verdict?.verdict ?? null, latencyMs: Math.round(performance.now() - t0) });
    return r;
  }

  async function onRate(grade: Grade, overridden: boolean, _a: AnswerOutput, inputKind: AnswerPayload['inputKind']) {
    const r = await challengeClient.rate({ sessionId: s.sessionId, itemId: item.id, grade, overridden });
    if (!r.ok) return false;
    if (overridden) track('grade_overridden', {});
    track('review_completed', { grade, mode: item.mode, inputKind, overridden });
    const queue = s.queue.slice(1);
    const tally = { correct: s.correct + (grade === 'again' ? 0 : 1), wrong: s.wrong + (grade === 'again' ? 1 : 0) };
    if (queue.length === 0) void finish(s.sessionId, s.items, tally);
    else setState({ ...s, queue, ...tally });
    return true;
  }

  async function onSkip() {
    const r = await challengeClient.skip({ sessionId: s.sessionId, itemId: item.id });
    if (!r.ok) {
      if (r.error.code === 'conflict') setState({ ...s, skips: { ...s.skips, [item.id]: MAX_SKIPS } });
      return r.error.code === 'conflict' ? ('limit' as const) : ('error' as const);
    }
    setState({ ...s, queue: [...s.queue.slice(1), item.id], skips: { ...s.skips, [item.id]: (s.skips[item.id] ?? 0) + 1 } });
    return 'ok' as const;
  }

  async function onDispute() {
    const r = await challengeClient.dispute({ sessionId: s.sessionId, itemId: item.id });
    if (r.ok) track('answer_disputed', {});
    return r.ok;
  }

  return (
    <div className="flex flex-col gap-6">
      {heading}
      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold text-muted">{t('challenge.progress', { n: Math.min(done + 1, s.total), total: s.total })}</p>
        <Progress aria-label={t('challenge.progressLabel')} value={done} max={s.total} />
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <ItemView
          key={item.id}
          item={item}
          canSkip={s.queue.length > 1 && (s.skips[item.id] ?? 0) < MAX_SKIPS}
          onAnswer={onAnswer}
          onRate={onRate}
          onDispute={onDispute}
          onSkip={onSkip}
        />
        <SidePanel context={item.context} modes={[...new Set(s.items.map((i) => i.mode))]} correct={s.correct} wrong={s.wrong} left={s.queue.length} />
      </div>
    </div>
  );
}
