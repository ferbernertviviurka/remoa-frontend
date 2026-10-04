'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { caseStages, type AnswerOutput, type ChallengeItemPublic, type Grade, type MapState, type RetrievabilityMap } from '@remoa/contracts';
import { t } from '@remoa/strings';
import { Alert, Button, QuestionPanel, RatingButton, RatingGroup, Skeleton, Tag, VerdictBox, type AnswerMode } from '@remoa/ui';
import { track } from '@/lib/analytics';
import type { AnswerPayload } from './client';
import { Occlusion } from './occlusion';
import { MAX_SKIPS, useChallenge, type Scope } from './provider';
import { Summary } from './summary';

const grades = ['again', 'hard', 'good', 'easy'] as const;
const letters = ['A', 'B', 'C', 'D'];
const fallbackText = { no_rubric: 'challenge.fallbackNoRubric', grader_error: 'challenge.fallbackGraderError', quota: 'challenge.fallbackQuota' } as const;
const subjectOf = { next_step: 'step', case: 'stage', occlusion: 'region', edge: 'card', hidden_card: 'card' } as const;

const voiceSoon = { recordLabel: t('quiz.voiceRecord'), soonLabel: t('quiz.voiceSoon'), note: t('quiz.voiceSoonNote') };

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
};

/** Painel do desafio (Desafio.dc.html): sessão F04 dentro do editor. Troca de mapa quando o item da fila diária é de outro. */
export function ChallengePanel({ scope, boardId, heat, onExit, onRated }: Props) {
  const ch = useChallenge();
  const router = useRouter();
  const s = ch.state;
  const item = s.phase === 'running' ? s.items.find((i) => i.id === s.queue[0]) : undefined;
  const elsewhere = item && item.boardId !== boardId ? item.boardId : null;

  useEffect(() => {
    if (elsewhere) router.replace(`/app/mapas/${elsewhere}?modo=desafio&sessao=diaria`, { scroll: false });
  }, [elsewhere, router]);

  const loading = (
    <div role="status" aria-label={t('challenge.loading')} className="p-5">
      <Skeleton lines={5} />
    </div>
  );
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
      onRated={onRated}
    />
  );
}

type Busy = AnswerPayload['inputKind'] | 'rate' | 'skip' | null;

function ItemQuestion({ item, n, total, done, state, canSkip, onRated }: { item: ChallengeItemPublic; n: number; total: number; done: number; state: MapState | undefined; canSkip: boolean; onRated: () => void }) {
  const ch = useChallenge();
  const canWrite = item.grading !== 'none';
  const canPick = !!item.options;
  const selfOnly = !canWrite && !canPick;
  const modes = [...(canWrite || selfOnly ? [{ value: 'write' as const, label: t('challenge.write') }] : []), ...(canPick ? [{ value: 'options' as const, label: t('challenge.options') }] : []), ...(canWrite ? [{ value: 'speak' as const, label: t('quiz.speak') }] : [])];
  const [mode, setMode] = useState<AnswerMode>(modes[0]!.value);
  const [text, setText] = useState('');
  const [picked, setPicked] = useState<string | null>(null);
  const [busy, setBusy] = useState<Busy>(null);
  const [answered, setAnswered] = useState<{ out: AnswerOutput; kind: AnswerPayload['inputKind'] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [skipLimit, setSkipLimit] = useState(false);
  const [dispute, setDispute] = useState<'idle' | 'busy' | 'done' | 'error'>('idle');
  const result = useRef<HTMLDivElement>(null);
  const start = useRef(0);
  useEffect(() => {
    start.current = performance.now();
  }, []);

  const out = answered?.out;
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
    const r = await ch.answer(item, p, Math.round(performance.now() - start.current));
    setBusy(null);
    if (r.ok) setAnswered({ out: r.data, kind: p.inputKind });
    else setError(t('challenge.answerError'));
  }
  const showWrite = mode === 'write';
  const submitText = () => text.trim() && void submit({ inputKind: 'text', text: text.trim() });
  const submitPick = () => picked !== null && void submit({ inputKind: 'mcq', optionIndex: Number(picked) });
  const reveal = () => void submit({ inputKind: 'self' });
  const check = () => (selfOnly ? reveal() : showWrite ? submitText() : submitPick());
  const canCheck = !busy && (selfOnly || (mode === 'speak' ? false : showWrite ? !!text.trim() : picked !== null));

  async function rate(g: Grade) {
    if (!answered || busy || (answered.out.gradeLocked && g !== 'again')) return;
    setBusy('rate');
    setError(null);
    const ok = await ch.rate(item, g, answered.out.suggestedGrade != null && g !== answered.out.suggestedGrade, answered.kind);
    if (ok) return onRated();
    setBusy(null);
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

  // FR-10. Typing in a field only honours Ctrl/Cmd+Enter; focused buttons keep their native Enter.
  const latest = useRef({ rate, skip, check, reveal });
  latest.current = { rate, skip, check, reveal };
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = e.target as HTMLElement;
      const typing = el.tagName === 'TEXTAREA' || el.tagName === 'INPUT' || el.isContentEditable;
      const h = latest.current;
      if (e.repeat) return; // a held Enter must not reveal and then confirm the suggested grade
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        if (answered || !showWrite) return;
        e.preventDefault();
        return void (text.trim() && h.check());
      }
      if (typing || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === 'Escape') return void h.skip();
      if (e.key >= '1' && e.key <= '4' && answered) return void h.rate(grades[Number(e.key) - 1]!);
      if (e.key === 'Enter' && !el.closest('button, a, [role="radio"]')) {
        if (answered) return void (answered.out.suggestedGrade && h.rate(answered.out.suggestedGrade));
        if (!selfOnly && showWrite && text.trim()) return h.check();
        if (!selfOnly && !showWrite && picked !== null) return h.check();
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

  const resultNode = out ? (
    <div ref={result} tabIndex={-1} className="flex flex-col gap-4 outline-none">
      {answered.kind === 'text' ? (
        <p className="m-0 text-sm text-muted"><strong>{t('challenge.yourAnswer')}:</strong> {text}</p>
      ) : null}
      <div className="rounded-[14px] bg-primary-tint px-4 py-3 text-primary-deep">
        <p className="m-0 text-xs font-bold uppercase tracking-[.13em]">{t('challenge.canonical')}</p>
        <p className="mb-0 mt-1 whitespace-pre-wrap font-semibold">{out.canonical}</p>
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
          {dispute === 'done' ? (
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
      {out.fallback ? (
        <Alert tone={out.fallback === 'quota' ? 'watch' : 'unknown'} title={t(fallbackText[out.fallback])}>
          {out.fallback === 'quota' ? <Link href="/app/planos?de=ai_quota" className="font-semibold underline">{t('challenge.quotaCta')}</Link> : null}
        </Alert>
      ) : null}
      {out.gradeLocked ? <Alert tone="review" title={t('challenge.gradeLocked')} /> : null}
      <RatingGroup label={suggested ? t('quiz.ratingLabelSuggested', { grade: t(`grade.${suggested}`) }) : t('quiz.ratingLabel')}>
        {grades.map((g, i) =>
          out.gradeLocked && g !== 'again' ? null : ( // RatingButton v2 has no `disabled` (CCR): a locked grade is not offered
            <RatingButton key={g} label={t(`grade.${g}`)} hint={interval(out.preview[g].intervalDays)} shortcut={String(i + 1)} suggested={suggested === g} onClick={() => void rate(g)} />
          ),
        )}
      </RatingGroup>
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
        <QuestionPanel
          eyebrow={t('editor.challenge')}
          progressText={t('challenge.progress', { n, total })}
          progress={done / total}
          progressLabel={t('challenge.progressLabel')}
          chips={chips}
          question={question}
          modeLabel={t('challenge.answerMode')}
          modes={modes}
          mode={mode}
          onModeChange={setMode}
          answerLabel={t('challenge.textLabel')}
          answer={text}
          onAnswerChange={setText}
          optionsLabel={t('challenge.optionsLabel')}
          options={(item.options ?? []).map((o, i) => ({ id: String(i), key: letters[i]!, text: o }))}
          selectedOption={picked}
          onSelectOption={setPicked}
          checkLabel={busy === 'text' || busy === 'voice' ? t('challenge.grading') : selfOnly ? t('challenge.reveal') : showWrite ? t('challenge.submitText') : t('challenge.submitOption')}
          canCheck={canCheck}
          onCheck={check}
          // D-203: "Falar" stays visible with the record button disabled and "Em breve"; no Web Speech transcription until F09
          voice={voiceSoon}
          result={resultNode}
        />
      </div>
      {!out ? (
        <div className="flex shrink-0 flex-col gap-1.5 border-t border-border px-5 py-3">
          {error ? <Alert tone="review" role="alert" title={error} /> : null}
          {item.grading === 'none' ? <p className="m-0 text-xs text-muted">{t('challenge.noRubricBody')}</p> : null}
          <div className="flex gap-2">
            {!selfOnly ? (
              <Button variant="secondary" size="sm" loading={busy === 'self'} disabled={!!busy} onClick={reveal}>{t('challenge.reveal')}</Button>
            ) : null}
            <Button variant="secondary" size="sm" disabled={!canSkip || skipLimit || !!busy} onClick={() => void skip()}>{t('challenge.skip')}</Button>
          </div>
          {skipLimit || !canSkip ? <p role="status" className="m-0 text-xs text-muted">{t('challenge.skipLimit')}</p> : null}
          <p className="m-0 text-xs text-muted">{t('challenge.shortcuts')}</p>
        </div>
      ) : null}
    </div>
  );
}
