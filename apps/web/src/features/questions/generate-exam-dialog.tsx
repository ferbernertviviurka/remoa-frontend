'use client';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CHALLENGE_SIZES, type BoardSummary, type ChallengeConfig } from '@remoa/contracts';
import { Alert, Autocomplete, Button, ChoiceRow, Dialog, Input, Segmented, Stepper, type AutocompleteOption, type AutocompleteValue } from '@remoa/ui';
import { api } from '@/lib/api';
import { aiChallengeHref, startAiChallenge } from '@/features/challenge-ai/start-ai';
import { t } from './labels';
import { listQuestionTaxonomy } from './api';

type Kind = 'objective' | 'discursive' | 'mixed';
type Mode = 'study' | 'simulation';
const STEPS = ['map', 'subject', 'format', 'review'] as const;
type Step = (typeof STEPS)[number];
const KINDS = ['objective', 'discursive', 'mixed'] as const;

const matches = (query: string, name: string) => name.toLocaleLowerCase('pt-BR').includes(query.trim().toLocaleLowerCase('pt-BR'));
const toOptions = (items: { id: string; name: string }[]): AutocompleteOption[] => items.map((item) => ({ value: item.id, label: item.name }));
const timeOk = (perQuestion: number, total: number) =>
  Number.isInteger(perQuestion) && perQuestion >= 30 && perQuestion <= 600 && Number.isInteger(total) && total >= 0 && total <= 240;
/** Upper bound of `ai_question_batches` units: batches of 10 per answer type, so a mixed request can split into one more. */
export const maxBatches = (count: number, kind: Kind) => Math.ceil(count / 10) + (kind === 'mixed' ? 1 : 0);

function Pick({ label, placeholder, value, options, onChange, error }: { label: string; placeholder?: string; value: AutocompleteValue | null; options: AutocompleteOption[]; onChange: (next: AutocompleteValue | null) => void; error?: string }) {
  return (
    <Autocomplete label={label} placeholder={placeholder ?? t('questions.generateSearchPlaceholder')} value={value} options={options} onValueChange={onChange} error={error}
      emptyLabel={t('questions.generateEmpty')} clearAriaLabel={t('questions.generateClear')} moreLabel={(n) => t('questions.generateMore', { n })} />
  );
}

/**
 * Starts a generated exam from a map the student already has, in four steps (D-1846 pattern):
 * Mapa → Assunto (optional) → Formato (mode, size, answer type, time) → Revisar (summary + AI quota notice, then generate).
 */
export function GenerateExamDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const router = useRouter();
  const ids = useId();
  const heading = useRef<HTMLHeadingElement>(null);
  const moved = useRef(false);
  const [step, setStep] = useState(0);
  const [tried, setTried] = useState(false);
  const [boards, setBoards] = useState<BoardSummary[]>([]);
  const [boardsReady, setBoardsReady] = useState(false);
  const [areas, setAreas] = useState<AutocompleteOption[]>([]);
  const [topics, setTopics] = useState<AutocompleteOption[]>([]);
  const [board, setBoard] = useState<AutocompleteValue | null>(null);
  const [area, setArea] = useState<AutocompleteValue | null>(null);
  const [topic, setTopic] = useState<AutocompleteValue | null>(null);
  const [count, setCount] = useState<number>(10);
  const [kind, setKind] = useState<Kind>('mixed');
  const [perQuestion, setPerQuestion] = useState(90);
  const [total, setTotal] = useState(15);
  const [mode, setMode] = useState<Mode>('simulation');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let active = true;
    setBoardsReady(false);
    void Promise.all([
      api<BoardSummary[]>('/v1/boards').then((result) => { if (!active) return; if (result.ok) setBoards(result.data); else setError(t('questions.generateError')); }).catch(() => { if (active) setError(t('questions.generateError')); }),
      listQuestionTaxonomy('area').then((value) => { if (active) setAreas(toOptions(value)); }).catch(() => undefined),
      listQuestionTaxonomy('topic').then((value) => { if (active) setTopics(toOptions(value)); }).catch(() => undefined),
    ]).finally(() => { if (active) setBoardsReady(true); });
    return () => { active = false; };
  }, [open]);

  // Focus follows the step: the new step's heading is announced and Tab continues from there (not on first open; the dialog focuses itself).
  useEffect(() => { if (moved.current) heading.current?.focus(); }, [step]);

  const maps = useMemo(() => boards.map((item) => ({ value: item.id, label: item.title })), [boards]);
  const topicOptions = useMemo(() => {
    if (!area) return topics;
    const narrowed = topics.filter((item) => matches(area.label, item.label) || matches(item.label, area.label));
    return narrowed.length ? narrowed : topics;
  }, [area, topics]);

  const boardId = board?.value ?? null;
  const current: Step = STEPS[step] ?? 'map';
  const stepError = current === 'map' && !boardId ? t('questions.generateNeedMap') : current === 'format' && !timeOk(perQuestion, total) ? t('questions.generateNeedTime') : null;
  const go = (next: number) => { moved.current = true; setTried(false); setError(null); setStep(next); };
  const forward = () => { if (stepError) { setTried(true); return; } go(step + 1); };
  const setCountAndTime = (next: number) => { setCount(next); if (Number.isFinite(perQuestion)) setTotal(Math.max(1, Math.round((perQuestion * next) / 60))); };

  const start = async () => {
    if (!boardId) { go(0); return; }
    const subjectId = topic?.value ?? area?.value ?? null;
    const config: ChallengeConfig = {
      boardId,
      scope: { kind: 'board' },
      format: 'generated',
      n: count,
      difficulty: 'mixed',
      questionType: kind,
      grading: mode === 'simulation' ? 'end' : 'immediate',
      timerSec: total > 0 ? total * 60 : null,
      preset: mode === 'simulation' ? 'mock' : 'practice',
      ...(subjectId ? { enamedTopicId: subjectId } : {}),
    };
    setBusy(true);
    setError(null);
    const result = await startAiChallenge(config);
    setBusy(false);
    if (!result.ok) { setError(t(result.error.code === 'quota_exceeded' ? 'questions.generateQuotaError' : 'questions.generateError')); return; }
    onOpenChange(false);
    router.push(aiChallengeHref(boardId, result.data.id));
  };

  const helpId = `${ids}-time-help`;
  const shownError = tried ? stepError : null;
  const summary: { step: number; label: string; value: string }[] = [
    { step: 0, label: t('questions.generateContent'), value: board?.label ?? '' },
    { step: 1, label: t('questions.generateSpecialty'), value: area?.label ?? t('questions.generateAnySubject') },
    { step: 1, label: t('questions.generateSubject'), value: topic?.label ?? t('questions.generateAnySubject') },
    { step: 2, label: t('questions.mode'), value: t(mode === 'simulation' ? 'questions.simulation' : 'questions.study') },
    { step: 2, label: t('questions.generateCount'), value: t('questions.examCount', { n: count }) },
    { step: 2, label: t('questions.generateType'), value: t(`questions.generateTypes.${kind}`) },
    { step: 2, label: t('questions.generateTotal'), value: total > 0 ? t('questions.examDuration', { n: total }) : t('questions.generateNoTimer') },
  ];

  const footer = (
    // xl has no fixed footer slot, so the actions stick to the bottom of the scrolling dialog (and cover its 28 px padding).
    <div className="sticky bottom-[-1.75rem] -mb-7 flex flex-wrap items-center justify-between gap-3 border-t border-border bg-surface pb-7 pt-4">
      {step > 0 ? <Button variant="secondary" disabled={busy} onClick={() => go(step - 1)}>{t('common.back')}</Button> : <span aria-hidden="true" />}
      {current === 'review'
        ? <Button loading={busy} loadingLabel={t('questions.starting')} disabled={!boardId} onClick={() => void start()}>{t('questions.generateStart')}</Button>
        : <Button onClick={forward}>{t('questions.generateNext')}</Button>}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!busy) onOpenChange(next); }} title={t('questions.generateTitle')} description={t('questions.generateDescription')} closeLabel={t('common.close')} size="xl">
      <div className="flex flex-col gap-5">
        <Stepper aria-label={t('questions.generateStepsLabel')} doneLabel={t('questions.generateStepDone')} current={step} steps={STEPS.map((id) => t(`questions.generateSteps.${id}`))} />
        <div className="flex flex-col gap-1">
          <h3 ref={heading} tabIndex={-1} className="m-0 font-display text-xl font-bold outline-none">{t(`questions.generateSteps.${current}`)}</h3>
          <p className="m-0 text-sm text-muted">{t(`questions.generateStepHelp.${current}`)}</p>
        </div>

        {current === 'map' ? (
          <>
            {boardsReady && boards.length === 0 && !error ? <Alert tone="watch" title={t('questions.generateNoMaps')} /> : null}
            <Pick label={t('questions.generateContent')} placeholder={t('questions.generateContentPlaceholder')} value={board} options={maps} onChange={(next) => { setBoard(next?.value ? next : null); setTried(false); }} error={shownError ?? undefined} />
          </>
        ) : null}

        {current === 'subject' ? (
          <>
            <Pick label={t('questions.generateSpecialty')} value={area} options={areas} onChange={(next) => setArea(next?.value ? next : null)} />
            <Pick label={t('questions.generateSubject')} value={topic} options={topicOptions} onChange={(next) => setTopic(next?.value ? next : null)} />
          </>
        ) : null}

        {current === 'format' ? (
          <>
            <div role="group" aria-label={t('questions.mode')} className="flex flex-col gap-3">
              <ChoiceRow indicator="radio" size="lg" selected={mode === 'simulation'} onSelect={() => setMode('simulation')} title={t('questions.simulation')} description={t('questions.simulationDescription')} />
              <ChoiceRow indicator="radio" size="lg" selected={mode === 'study'} onSelect={() => setMode('study')} title={t('questions.study')} description={t('questions.studyDescription')} />
            </div>
            <div className="flex flex-col gap-2">
              <span className="font-bold text-ink" aria-hidden="true">{t('questions.generateCount')}</span>
              <Segmented fill aria-label={t('questions.generateCount')} value={String(count)} onValueChange={(value) => setCountAndTime(Number(value))} options={CHALLENGE_SIZES.map((value) => ({ value: String(value), label: String(value) }))} />
            </div>
            <div className="flex flex-col gap-2">
              <span className="font-bold text-ink" aria-hidden="true">{t('questions.generateType')}</span>
              <Segmented fill aria-label={t('questions.generateType')} value={kind} onValueChange={(value) => setKind(value as Kind)} options={KINDS.map((value) => ({ value, label: t(`questions.generateTypes.${value}`) }))} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label={t('questions.generatePerQuestion')} type="number" inputMode="numeric" min={30} max={600} value={Number.isNaN(perQuestion) ? '' : perQuestion} aria-invalid={shownError ? true : undefined} aria-describedby={helpId}
                onChange={(event) => { const next = event.target.value === '' ? NaN : Number(event.target.value); setPerQuestion(next); if (Number.isFinite(next)) setTotal(Math.max(1, Math.round((next * count) / 60))); }} />
              <Input label={t('questions.generateTotal')} type="number" inputMode="numeric" min={0} max={240} value={Number.isNaN(total) ? '' : total} aria-invalid={shownError ? true : undefined} aria-describedby={helpId}
                onChange={(event) => setTotal(event.target.value === '' ? NaN : Number(event.target.value))} />
            </div>
            <p id={helpId} className={`m-0 text-sm ${shownError ? 'font-bold text-review-text' : 'text-muted'}`}>{shownError ?? t('questions.generateTotalHelp')}</p>
          </>
        ) : null}

        {current === 'review' ? (
          <>
            <Alert tone="watch" title={t('questions.generateQuota', { n: maxBatches(count, kind) })} />
            <dl className="m-0 flex flex-col divide-y divide-border rounded-review border border-border">
              {summary.map((row) => (
                <div key={row.label} className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <div className="min-w-0">
                    <dt className="text-xs font-bold text-muted">{row.label}</dt>
                    <dd className="m-0 break-words font-bold text-ink">{row.value}</dd>
                  </div>
                  <Button variant="quiet" disabled={busy} aria-label={t('questions.generateEdit', { step: row.label })} onClick={() => go(row.step)}>{t('questions.generateEditShort')}</Button>
                </div>
              ))}
            </dl>
          </>
        ) : null}

        {error ? <Alert tone="review" role="alert" title={error} /> : null}
        {footer}
      </div>
    </Dialog>
  );
}
