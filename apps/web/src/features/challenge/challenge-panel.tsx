'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { CHALLENGE_MIN_CARDS, SELF_MARK_GRADE, caseStages, challengeErrors, type AnswerOutput, type ChallengeItemPublic, type Grade, type MapState, type RetrievabilityMap } from '@remoa/contracts';
import { withStrings } from '@remoa/strings';
import * as more from '@remoa/strings/ns';
import { Alert, Button, QuestionPanel, RatingButton, RatingGroup, Skeleton, Tag, VerdictBox } from '@remoa/ui';
import { track } from '@/lib/analytics';
import { AiNotice, AiSource, AiStreaming, AiWarning, FlagGradeButton } from '@/features/ai/ai-notice';
import type { AiExtra } from '@/features/ai/types';
import type { AnswerPayload } from './client';
import { Occlusion } from './occlusion';
import { MAX_SKIPS, useChallenge, type Scope } from './provider';
import { countSession } from '@/features/shell/pwa';
import { Summary } from './summary';

const t = withStrings({ cards: more.cards, challenge: more.challenge });

const grades = ['again', 'hard', 'good', 'easy'] as const;
const fallbackText = { no_rubric: 'challenge.fallbackNoRubric', grader_error: 'challenge.fallbackGraderError', quota: 'challenge.fallbackQuota', offline: 'challenge.fallbackOffline' } as const;
const subjectOf = { next_step: 'step', case: 'stage', occlusion: 'region', edge: 'card', hidden_card: 'card' } as const;

function interval(days: number) {
  const n = Math.round(days);
  return n < 1 ? t('challenge.intervalDays.zero') : n === 1 ? t('challenge.intervalDays.one') : t('challenge.intervalDays.many', { n });
}

type Props = {
  scope: Scope;
  boardId: string;
  heat: RetrievabilityMap;
  /** "Sair do desafio": back to `?` without mode. */
  onExit: () => void;
  /** After each rating: the map refreshes the recall colours. */
  onRated: () => void;
  /** D-579: cards still missing for a board challenge (> 0 = blocked here, no request). */
  missing?: number;
};

/** Painel do desafio (Desafio.dc.html): sessão F04 dentro do editor. Troca de mapa quando o item da fila diária é de outro. */
export function ChallengePanel({ scope, boardId, heat, onExit, onRated, missing = 0 }: Props) {
  const ch = useChallenge();
  const router = useRouter();
  const s = ch.state;
  const item = s.phase === 'running' ? s.items.find((i) => i.id === s.queue[0]) : undefined;
  const elsewhere = item && item.boardId !== boardId ? item.boardId : null;

  useEffect(() => {
    if (elsewhere) router.replace(`/app/mapas/${elsewhere}?modo=desafio&sessao=diaria`, { scroll: false });
  }, [elsewhere, router]);
  useEffect(() => {
    if (s.phase === 'done') countSession();
  }, [s.phase]);

  const loading = (
    <div role="status" aria-label={t('challenge.loading')} className="p-5">
      <Skeleton lines={5} />
    </div>
  );
  const blocked = (body: string) => (
    <div className="flex flex-col gap-3 p-5">
      <h2 className="m-0 font-display text-[21px] font-bold">{t('challengeSetup.minCards.title')}</h2>
      <p className="m-0 text-sm text-muted">{body}</p>
      <Button variant="secondary" onClick={onExit}>{t('quiz.exit')}</Button>
    </div>
  );
  if (missing > 0) return blocked(t('challengeSetup.minCards.body', { min: CHALLENGE_MIN_CARDS, n: missing }));
  if (s.phase === 'error' && s.code === challengeErrors.minCards) return blocked(t('challengeSetup.answer.minCardsError'));
  if (s.phase === 'idle' || s.phase === 'loading' || s.phase === 'finishing' || elsewhere) return loading;
  if (s.phase === 'error')
    return (
      <div className="flex flex-col gap-3 p-5">
        <Alert tone="review" role="alert" title={t('challenge.loadError')}>
          <Button variant="secondary" onClick={() => void ch.begin(scope)}>{t('common.retry')}</Button>
        </Alert>
        <Button variant="secondary" onClick={onExit}>{t('quiz.exit')}</Button>
      </div>
    );
  if (s.phase === 'empty')
    return (
      <div className="flex flex-col gap-3 p-5">
        <h2 className="m-0 font-display text-[21px] font-bold">{t('challenge.empty.title')}</h2>
        <p className="m-0 text-sm text-muted">{t('challenge.empty.body')}</p>
        <Button variant="secondary" onClick={onExit}>{t('quiz.exit')}</Button>
      </div>
    );
  if (s.phase === 'done') return <Summary summary={s.summary} items={s.items} onMore={() => void ch.begin(scope, 5)} onExit={onExit} />;

  const done = s.total - s.queue.length;
  const entry = heat[item!.cardId];
  const state: MapState | undefined = (item!.subId ? entry?.subs?.[item!.subId]?.state : undefined) ?? entry?.state;
  return (
    <ItemQuestion
      key={item!.id}
      item={item!}
      n={Math.min(done + 1, s.total)}
      total={s.total}
      done={done}
      state={state}
      canSkip={s.queue.length > 1 && (s.skips[item!.id] ?? 0) < MAX_SKIPS}
      // D-576: a board session in "Eu respondo" is marked Acertei/Errei; the daily queue (Revisar hoje) keeps the 4 grades
      selfMark={scope.kind === 'board' && ch.options?.gradingMode !== 'ai'}
      onRated={onRated}
    />
  );
}

/** Card flip (rotateY, ~450 ms) between the question and the answer. Reduced motion (system or <html data-motion="reduced">) swaps directly: motion.css zeroes the transition. */
function Flip({ flipped, front, back }: { flipped: boolean; front: ReactNode; back: ReactNode }) {
  const face = 'col-start-1 row-start-1 min-h-0 [backface-visibility:hidden]';
  return (
    <div className="grid h-full min-h-0 [perspective:1400px]">
      <div className={`grid h-full min-h-0 transition-transform duration-[450ms] ease-in-out [transform-style:preserve-3d] ${flipped ? '[transform:rotateY(180deg)]' : ''}`}>
        <div className={face} aria-hidden={flipped || undefined} inert={flipped}>{front}</div>
        <div className={`${face} [transform:rotateY(180deg)]`} aria-hidden={!flipped || undefined} inert={!flipped}>{back}</div>
      </div>
    </div>
  );
}

type Busy = AnswerPayload['inputKind'] | 'rate' | 'skip' | null;
type ItemProps = { item: ChallengeItemPublic; n: number; total: number; done: number; state: MapState | undefined; canSkip: boolean; selfMark: boolean; onRated: () => void };

const marks = [
  { grade: SELF_MARK_GRADE.wrong, label: 'challengeSetup.answer.wrong', key: '1' },
  { grade: SELF_MARK_GRADE.correct, label: 'challengeSetup.answer.correct', key: '2' },
] as const;

/**
 * One item. G14 C1: answer by writing (Voz "Em breve"), reveal the card's answer (Space / Ctrl+Enter), then
 * Acertei/Errei (1/2, board session in "Eu respondo") or the 4 grades with their next interval (1–4, daily queue).
 * The server only grades with `gradingMode: 'ai'` (F20); a verdict, when present, is still shown.
 */
function ItemQuestion({ item, n, total, done, state, canSkip, selfMark, onRated }: ItemProps) {
  const ch = useChallenge();
  const ai = ch.options?.gradingMode === 'ai';
  const modes = [
    { value: 'write' as const, label: t('challenge.write') },
    { value: 'speak' as const, label: t('challengeSetup.answer.voice'), disabled: true, badge: t('challengeSetup.dialog.soon') },
  ];
  const [text, setText] = useState('');
  const [busy, setBusy] = useState<Busy>(null);
  const [rating, setRating] = useState<Grade | null>(null);
  const [answered, setAnswered] = useState<{ out: AnswerOutput; kind: AnswerPayload['inputKind'] } | null>(null);
  const [live, setLive] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [skipLimit, setSkipLimit] = useState(false);
  const [dispute, setDispute] = useState<'idle' | 'busy' | 'done' | 'error'>('idle');
  const result = useRef<HTMLDivElement>(null);
  const start = useRef(0);
  useEffect(() => {
    start.current = performance.now();
  }, []);

  const out = answered?.out;
  const x: AiExtra = (out ?? {}) as AiExtra; // TODO(CCR): AnswerOutput gains ai/gradeId/sourceQuote/remaining
  useEffect(() => {
    if (out) result.current?.focus(); // the clicked button just unmounted: keep focus (and the announcement) on the result
  }, [out]);
  useEffect(() => {
    if (out?.fallback === 'quota') track('paywall_viewed', { reason: 'ai_quota' });
  }, [out]);

  async function submit(p: AnswerPayload) {
    if (busy || answered) return;
    setBusy(p.inputKind);
    setError(null);
    setLive('');
    const r = await ch.answer(item, p, Math.round(performance.now() - start.current), ai ? (chunk) => setLive((prev) => prev + chunk) : undefined);
    setBusy(null);
    if (r.ok) setAnswered({ out: r.data, kind: p.inputKind });
    else setError(t('challenge.answerError'));
  }
  // what was written goes with the reveal (kept, D-123); nothing written = plain self-assessment
  const reveal = () => void submit(text.trim() ? { inputKind: 'text', text: text.trim() } : { inputKind: 'self' });

  async function rate(g: Grade) {
    if (!answered || busy || (answered.out.gradeLocked && g !== 'again')) return;
    setBusy('rate');
    setRating(g);
    setError(null);
    const ok = await ch.rate(item, g, answered.out.suggestedGrade != null && g !== answered.out.suggestedGrade, answered.kind);
    if (ok) return onRated();
    setBusy(null);
    setRating(null);
    setError(t('challenge.rateError'));
  }

  async function skip() {
    if (answered || busy || !canSkip || skipLimit) return;
    setBusy('skip');
    const r = await ch.skip(item);
    setBusy(null);
    if (r === 'limit') setSkipLimit(true);
    if (r === 'error') setError(t('challenge.skipError'));
  }

  // FR-10 + G14: typing only honours Ctrl/Cmd+Enter; focused buttons keep their native Enter/Space.
  const latest = useRef({ rate, skip, reveal });
  latest.current = { rate, skip, reveal };
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = e.target as HTMLElement;
      const typing = el.tagName === 'TEXTAREA' || el.tagName === 'INPUT' || el.isContentEditable;
      const h = latest.current;
      if (e.repeat) return; // a held key must not reveal and then grade
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        if (answered) return;
        e.preventDefault();
        return h.reveal();
      }
      if (typing || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === 'Escape') return void h.skip();
      if (answered) {
        const g = selfMark ? marks.find((m) => m.key === e.key)?.grade : e.key >= '1' && e.key <= '4' ? grades[Number(e.key) - 1] : undefined;
        if (g) return void h.rate(g);
        if (e.key === 'Enter' && answered.out.suggestedGrade && !el.closest('button, a')) return void h.rate(answered.out.suggestedGrade);
        return;
      }
      if ((e.key === ' ' || e.key === 'Enter') && !el.closest('button, a, [role="radio"]')) {
        e.preventDefault();
        h.reveal();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const question = item.mode === 'edge' && item.context.edge ? t('challenge.edgeAsk', { from: item.context.edge.fromTitle, to: item.context.edge.toTitle }) : item.prompt;
  const chips = [
    { label: t(`challengeMode.${item.mode}`), tone: 'brand' as const },
    ...(state === 'review' || state === 'watch' ? [{ label: t('quiz.chipState', { subject: t(`quiz.subject.${subjectOf[item.mode]}`), state: t(`mapState.${state}`) }), tone: state }] : []),
  ];
  const suggested = out?.suggestedGrade ?? null;
  const v = out?.verdict;
  const list = (xs: string[], key: 'matched' | 'missing') => (xs.length ? `${t(`challenge.verdict.${key}`)}: ${xs.join('; ')}` : undefined);
  const hint = (g: Grade, key: string) => t('challengeSetup.answer.gradeHint', { interval: interval(out!.preview[g].intervalDays), key });

  const resultNode = out ? (
    <div ref={result} tabIndex={-1} className="slide flex flex-col gap-4 outline-none">
      {answered.kind === 'text' ? (
        <p className="m-0 rounded-[14px] border border-border px-4 py-3 text-sm"><strong>{t('challenge.yourAnswer')}:</strong> {text}</p>
      ) : null}
      <div className="rounded-[14px] bg-primary-tint px-4 py-3 text-primary-deep">
        <p className="m-0 text-xs font-bold uppercase tracking-[.13em]">{t('challenge.canonical')}</p>
        <p className="mb-0 mt-1 whitespace-pre-wrap text-[17px] font-semibold leading-[1.45]">{out.canonical}</p>
      </div>
      {v ? (
        <VerdictBox
          verdict={v.verdict}
          label={t(`quiz.verdictLabel.${v.verdict}`)}
          headline={t(`challenge.verdict.title.${v.verdict}`)}
          matched={list(v.matched, 'matched')}
          missing={list(v.missing, 'missing')}
          note={item.grading === 'rubric_own' ? t('challenge.ownRubric') : undefined}
        >
          {v.feedback ? <p className="m-0 text-sm">{v.feedback}</p> : null}
          <AiSource quote={x.sourceQuote ?? (v as { sourceQuote?: string | null }).sourceQuote} />
          <AiWarning />
          {x.gradeId ? (
            <FlagGradeButton gradeId={x.gradeId} />
          ) : dispute === 'done' ? (
            <p role="status" className="m-0 text-sm font-semibold">{t('challenge.disputed')}</p>
          ) : (
            <div className="flex flex-col items-start gap-1">
              <Button variant="quiet" loading={dispute === 'busy'} onClick={() => { setDispute('busy'); void ch.dispute(item).then((ok) => setDispute(ok ? 'done' : 'error')); }}>
                {t('quiz.dispute')}
              </Button>
              {dispute === 'error' ? <p role="alert" className="m-0 text-sm">{t('challenge.disputeError')}</p> : null}
            </div>
          )}
        </VerdictBox>
      ) : null}
      {x.ai || x.remaining != null ? <AiNotice ai={x.ai} usage={x} /> : null}
      {out.fallback && !x.ai ? (
        <Alert tone={out.fallback === 'quota' ? 'watch' : 'unknown'} title={t(fallbackText[out.fallback])}>
          {out.fallback === 'quota' ? <Link href="/app/planos?de=ai_quota" className="font-semibold underline">{t('challenge.quotaCta')}</Link> : null}
        </Alert>
      ) : null}
      {out.gradeLocked ? <Alert tone="review" title={t('challenge.gradeLocked')} /> : null}
      {selfMark && !v ? (
        <RatingGroup label={t('challengeSetup.answer.markLabel')} busy={busy === 'rate'}>
          {marks.map((m) => (
            <RatingButton key={m.grade} label={t(m.label)} hint={hint(m.grade, m.key)} shortcut={m.key} loading={rating === m.grade} disabled={busy === 'rate'} onClick={() => void rate(m.grade)} />
          ))}
        </RatingGroup>
      ) : (
        <RatingGroup busy={busy === 'rate'} label={suggested ? t('quiz.ratingLabelSuggested', { grade: t(`grade.${suggested}`) }) : t('quiz.ratingLabel')}>
          {grades.map((g, i) =>
            out.gradeLocked && g !== 'again' ? null : ( // RatingButton v2 has no `disabled` (CCR): a locked grade is not offered
              <RatingButton key={g} label={t(`grade.${g}`)} hint={hint(g, String(i + 1))} shortcut={String(i + 1)} suggested={suggested === g} loading={rating === g} disabled={busy === 'rate'} onClick={() => void rate(g)} />
            ),
          )}
        </RatingGroup>
      )}
      {error ? <Alert tone="review" role="alert" title={error} /> : null}
    </div>
  ) : undefined;

  const stages = item.mode === 'case' ? item.context.revealed : undefined;
  return (
    <div className="flex h-full min-h-0 flex-col">
      {item.mode === 'occlusion' && item.context.image && !out ? (
        <div className="shrink-0 border-b border-border px-5 py-3">
          <Occlusion image={item.context.image} />
        </div>
      ) : null}
      {item.context.neighbors.length ? (
        <ul aria-label={t('challenge.context')} className="m-0 flex max-h-36 shrink-0 list-none flex-col gap-1.5 overflow-auto border-b border-border px-5 py-3">
          {item.context.neighbors.map((nb) => (
            <li key={`${nb.title}-${nb.label ?? ''}`} className="rounded-xl bg-canvas px-3 py-2 text-sm">
              <span className="font-semibold">{nb.title}</span>
              {nb.label ? <span className="ml-2 text-muted">{nb.label}</span> : null}
            </li>
          ))}
        </ul>
      ) : null}
      {stages?.length ? (
        <ul aria-label={t('challenge.stagesLabel')} className="m-0 flex max-h-40 shrink-0 list-none flex-col gap-1.5 overflow-auto border-b border-border p-0 px-5 py-3">
          {stages.map((x, i) => (
            <li key={i} className="flex flex-col items-start gap-0.5 text-[13px]">
              {caseStages[i] ? <Tag>{t(`cards.case.stage.${caseStages[i]}`)}</Tag> : null}
              <span>{x}</span>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="min-h-0 flex-1">
        <Flip flipped={!!out} front={
<QuestionPanel
          eyebrow={t('editor.challenge')}
          progressText={t('challenge.progress', { n, total })}
          progress={done / total}
          progressLabel={t('challenge.progressLabel')}
          chips={chips}
          question={question}
          modeLabel={t('challenge.answerMode')}
          modes={modes}
          mode="write"
          onModeChange={() => undefined}
          answerLabel={t('challenge.textLabel')}
          answer={text}
          onAnswerChange={setText}
          optionsLabel={t('challenge.optionsLabel')}
          options={[]}
          selectedOption={null}
          onSelectOption={() => undefined}
          checkLabel={busy === 'text' && ai ? t('challenge.grading') : ai && text.trim() ? t('challenge.submitText') : t('challenge.reveal')}
          canCheck={!busy}
          onCheck={reveal}
        />
        } back={out ? <QuestionPanel
          eyebrow={t('editor.challenge')}
          progressText={t('challenge.progress', { n, total })}
          progress={done / total}
          progressLabel={t('challenge.progressLabel')}
          chips={chips}
          question={question}
          modeLabel={t('challenge.answerMode')}
          modes={modes}
          mode="write"
          onModeChange={() => undefined}
          answerLabel={t('challenge.textLabel')}
          answer={text}
          onAnswerChange={setText}
          optionsLabel={t('challenge.optionsLabel')}
          options={[]}
          selectedOption={null}
          onSelectOption={() => undefined}
          checkLabel={busy === 'text' && ai ? t('challenge.grading') : ai && text.trim() ? t('challenge.submitText') : t('challenge.reveal')}
          canCheck={!busy}
          onCheck={reveal}
          result={resultNode}
        />
        : null} />
      </div>
      {!out ? (
        <div className="flex shrink-0 flex-col gap-1.5 border-t border-border px-5 py-3">
          {busy === 'text' && ai ? <AiStreaming text={live} /> : null}
          {error && ai ? <AiNotice ai={{ status: 'error', code: 'answer_failed', message: null }} onRetry={reveal} /> : error ? <Alert tone="review" role="alert" title={error} /> : null}
          {ai && item.grading === 'none' ? <p className="m-0 text-xs text-muted">{t('challenge.noRubricBody')}</p> : null}
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" disabled={!canSkip || skipLimit || !!busy} onClick={() => void skip()}>{t('challenge.skip')}</Button>
          </div>
          {skipLimit || !canSkip ? <p role="status" className="m-0 text-xs text-muted">{t('challenge.skipLimit')}</p> : null}
          <p className="m-0 text-xs text-muted">{selfMark ? t('challengeSetup.answer.shortcutsSelf') : t('challengeSetup.answer.shortcutsDaily')}</p>
        </div>
      ) : null}
    </div>
  );
}
