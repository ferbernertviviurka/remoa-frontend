'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import type { AnswerOutput, ChallengeItemPublic, Grade, Result } from '@remoa/contracts';
import { t } from '@remoa/strings';
import { Alert, Button, Card, RadioGroup, RatingButton, Segmented, Skeleton, Textarea, VerdictBox } from '@remoa/ui';
import { track } from '@/lib/analytics';
import type { AnswerPayload } from './client';
import { ItemPrompt } from './item-prompt';

const grades = ['again', 'hard', 'good', 'easy'] as const;

function interval(days: number) {
  const n = Math.round(days);
  return n < 1 ? t('challenge.intervalDays.zero') : n === 1 ? t('challenge.intervalDays.one') : t('challenge.intervalDays.many', { n });
}

const fallbackText = { no_rubric: 'challenge.fallbackNoRubric', grader_error: 'challenge.fallbackGraderError', quota: 'challenge.fallbackQuota' } as const;

export type ItemViewProps = {
  item: ChallengeItemPublic;
  canSkip: boolean;
  onAnswer: (p: AnswerPayload, durationMs: number) => Promise<Result<AnswerOutput>>;
  onRate: (grade: Grade, overridden: boolean, answer: AnswerOutput, inputKind: AnswerPayload['inputKind']) => Promise<boolean>;
  onDispute: () => Promise<boolean>;
  onSkip: () => Promise<'ok' | 'limit' | 'error'>;
};

type Busy = AnswerPayload['inputKind'] | 'rate' | 'skip' | null;

/** One challenge. Keyed by item id by the parent, so every piece of state starts fresh per item. */
export function ItemView({ item, canSkip, onAnswer, onRate, onDispute, onSkip }: ItemViewProps) {
  const canWrite = item.grading !== 'none';
  const canPick = !!item.options;
  const [form, setForm] = useState<'write' | 'options'>(canWrite ? 'write' : 'options');
  const [text, setText] = useState('');
  const [picked, setPicked] = useState<string>('');
  const [busy, setBusy] = useState<Busy>(null);
  const [answered, setAnswered] = useState<{ out: AnswerOutput; kind: AnswerPayload['inputKind'] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [skipLimit, setSkipLimit] = useState(false);
  const [dispute, setDispute] = useState<'idle' | 'busy' | 'done' | 'error'>('idle');
  const heading = useRef<HTMLHeadingElement>(null);
  const result = useRef<HTMLDivElement>(null);
  const start = useRef(0);

  useEffect(() => {
    start.current = performance.now();
    heading.current?.focus();
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
    const r = await onAnswer(p, Math.round(performance.now() - start.current));
    setBusy(null);
    if (r.ok) setAnswered({ out: r.data, kind: p.inputKind });
    else setError(t('challenge.answerError'));
  }
  const submitText = () => text.trim() && void submit({ inputKind: 'text', text: text.trim() });
  const submitPick = () => picked !== '' && void submit({ inputKind: 'mcq', optionIndex: Number(picked) });
  const reveal = () => void submit({ inputKind: 'self' });
  const showWrite = canWrite && (!canPick || form === 'write');

  async function rate(g: Grade) {
    if (!answered || busy || (answered.out.gradeLocked && g !== 'again')) return;
    setBusy('rate');
    setError(null);
    const ok = await onRate(g, answered.out.suggestedGrade != null && g !== answered.out.suggestedGrade, answered.out, answered.kind);
    if (!ok) {
      setBusy(null);
      setError(t('challenge.rateError'));
    }
  }

  async function skip() {
    if (answered || busy || !canSkip || skipLimit) return;
    setBusy('skip');
    const r = await onSkip();
    setBusy(null);
    if (r === 'limit') setSkipLimit(true);
    if (r === 'error') setError(t('challenge.skipError'));
  }

  async function disagree() {
    setDispute('busy');
    setDispute((await onDispute()) ? 'done' : 'error');
  }

  // FR-10. Typing in a field only honours Ctrl/Cmd+Enter; focused buttons keep their native Enter.
  const latest = useRef({ rate, skip, submitText, submitPick, reveal });
  latest.current = { rate, skip, submitText, submitPick, reveal };
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = e.target as HTMLElement;
      const typing = el.tagName === 'TEXTAREA' || el.tagName === 'INPUT' || el.isContentEditable;
      const h = latest.current;
      if (e.repeat) return; // a held Enter must not reveal and then confirm the suggested grade
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        if (answered || !showWrite) return;
        e.preventDefault();
        return h.submitText();
      }
      if (typing || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === 'Escape') return void h.skip();
      if (e.key >= '1' && e.key <= '4' && answered) return void h.rate(grades[Number(e.key) - 1]!);
      if (e.key === 'Enter' && !el.closest('button, a, [role="radio"]')) {
        if (answered) return void (answered.out.suggestedGrade && h.rate(answered.out.suggestedGrade));
        if (showWrite && text.trim()) return h.submitText();
        if (!showWrite && canPick && form === 'options' && picked !== '') return h.submitPick();
        h.reveal();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <Card radius="review">
      <div className="flex flex-col gap-5">
        <ItemPrompt item={item} headingRef={heading} />
        <p role="status" className="sr-only">
          {out ? `${out.verdict ? t(`challenge.verdict.title.${out.verdict.verdict}`) : t('challenge.canonical')}: ${out.canonical}` : ''}
        </p>

        {!answered ? (
          <div className="flex flex-col gap-4">
            {!canWrite ? (
              <Alert tone="unknown" title={t('challenge.noRubric')}>
                <span>{t('challenge.noRubricBody')}</span>
              </Alert>
            ) : null}
            {canWrite && canPick ? (
              <Segmented
                aria-label={t('challenge.answerMode')}
                value={form}
                onValueChange={(v) => setForm(v as 'write' | 'options')}
                options={[
                  { value: 'write', label: t('challenge.write') },
                  { value: 'options', label: t('challenge.options') },
                ]}
              />
            ) : null}
            {showWrite ? (
              <>
                <Textarea label={t('challenge.textLabel')} value={text} onChange={(e) => setText(e.target.value)} maxLength={4000} />
                <Button loading={busy === 'text'} loadingLabel={t('challenge.grading')} disabled={!text.trim() || !!busy} onClick={submitText}>
                  {t('challenge.submitText')}
                </Button>
                {busy === 'text' ? <div role="status" aria-label={t('challenge.grading')}><Skeleton lines={3} /></div> : null}
              </>
            ) : canPick ? (
              <>
                <RadioGroup label={t('challenge.optionsLabel')} value={picked} onValueChange={setPicked} options={item.options!.map((o, i) => ({ value: String(i), label: o }))} />
                <Button loading={busy === 'mcq'} disabled={picked === '' || !!busy} onClick={submitPick}>
                  {t('challenge.submitOption')}
                </Button>
              </>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" loading={busy === 'self'} disabled={!!busy} onClick={reveal}>
                {t('challenge.reveal')}
              </Button>
              <Button variant="quiet" disabled={!canSkip || skipLimit || !!busy} onClick={() => void skip()}>
                {t('challenge.skip')}
              </Button>
            </div>
            {skipLimit || !canSkip ? <p role="status" className="text-sm text-muted">{t('challenge.skipLimit')}</p> : null}
            <p className="text-xs text-muted">{t('challenge.shortcuts')}</p>
          </div>
        ) : (
          <div ref={result} tabIndex={-1} className="flex flex-col gap-4 outline-none">
            {answered.kind === 'text' ? (
              <p className="text-sm text-muted">
                <strong>{t('challenge.yourAnswer')}:</strong> {text}
              </p>
            ) : null}
            <div className="rounded-map bg-primary-tint px-4 py-3 text-primary-deep">
              <p className="text-xs font-bold uppercase tracking-[.13em]">{t('challenge.canonical')}</p>
              <p className="mt-1 whitespace-pre-wrap font-semibold">{answered.out.canonical}</p>
            </div>
            {answered.out.verdict ? (
              <VerdictBox
                verdict={answered.out.verdict.verdict}
                title={t(`challenge.verdict.title.${answered.out.verdict.verdict}`)}
                matchedLabel={t('challenge.verdict.matched')}
                missingLabel={t('challenge.verdict.missing')}
                matched={answered.out.verdict.matched}
                missing={answered.out.verdict.missing}
                feedback={answered.out.verdict.feedback}
              >
                {item.grading === 'rubric_own' ? <p className="text-xs">{t('challenge.ownRubric')}</p> : null}
                {dispute === 'done' ? (
                  <p role="status" className="text-sm font-semibold">{t('challenge.disputed')}</p>
                ) : (
                  <div className="flex flex-col items-start gap-1">
                    <Button variant="quiet" loading={dispute === 'busy'} onClick={() => void disagree()}>
                      {t('challenge.dispute')}
                    </Button>
                    {dispute === 'error' ? <p role="alert" className="text-sm">{t('challenge.disputeError')}</p> : null}
                  </div>
                )}
              </VerdictBox>
            ) : null}
            {answered.out.fallback ? (
              <Alert tone={answered.out.fallback === 'quota' ? 'watch' : 'unknown'} title={t(fallbackText[answered.out.fallback])}>
                {answered.out.fallback === 'quota' ? <Link href="/conta" className="font-semibold underline">{t('challenge.quotaCta')}</Link> : null}
              </Alert>
            ) : null}
            {answered.out.gradeLocked ? <Alert tone="review" title={t('challenge.gradeLocked')} /> : null}
            <div className="flex flex-col gap-2">
              <p className="text-xs font-bold uppercase tracking-[.13em] text-muted">{t('challenge.gradeLabel')}</p>
              <div role="group" aria-label={t('challenge.gradeLabel')} className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {grades.map((g, i) => (
                  <RatingButton
                    key={g}
                    label={t(`grade.${g}`)}
                    hint={interval(answered.out.preview[g].intervalDays)}
                    shortcut={String(i + 1)}
                    selected={answered.out.suggestedGrade === g}
                    disabled={!!busy || (answered.out.gradeLocked && g !== 'again')}
                    onClick={() => void rate(g)}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
        {error ? <Alert tone="review" role="alert" title={error} /> : null}
      </div>
    </Card>
  );
}
