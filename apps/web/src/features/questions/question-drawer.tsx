'use client';
import { useEffect, useRef, useState } from 'react';
import { Alert, Button, Dialog, Icon, RadioGroup, Tag } from '@remoa/ui';
import type { QuestionDrawerAttempt, QuestionPublic } from '@remoa/contracts';
import { t } from './bank-t';
import { answerQuestion, getLastAttempt } from './api';
import { MapLink, ReportDialog } from './shared';
import { canSelectQuestion, isCatalogOnly, TeamDisclosure } from './team-disclosure';
import { isInstitutional, ValidationSeal } from './validation-seal';

/** D-1823/D-1824: AI questions carry "Gerada por IA" and never a seal; institutional = "Validado pela Remoa"; medical review names the reviewer, never a CRM. */
export function BankMeta({ question: q }: { question: QuestionPublic }) {
  const ai = q.origin === 'ai_generated';
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Tag tone={ai ? 'ai' : 'brand'}>{ai ? <span className="mr-1 inline-flex"><Icon name="sparkle" size={12} /></span> : null}{ai ? t('questionsBank.aiLabel') : t(`questions.source.${q.origin}`)}</Tag>
      <span className="text-xs text-muted">{t(q.teamDisclosure?.difficultyAssessment==='unassessed'?'questions.difficultyUnassessed':`questions.difficultyLabel.${q.difficulty}`)}</span>
      {ai ? null : isInstitutional(q.validation) ? <ValidationSeal validation={q.validation} /> : q.validation?.kind === 'medical_review' ? <Tag tone="steady">{t('questionsBank.sealMedicalBy', { name: q.validation.label })}</Tag> : null}
      {q.sourceLabel ? <span className="text-xs text-muted">{q.sourceLabel}</span> : null}
      <TeamDisclosure question={q} />
    </div>
  );
}

const resultKey = { correct: 'questionsBank.resultCorrect', incorrect: 'questionsBank.resultIncorrect', annulled: 'questionsBank.resultAnnulled' } as const;

export function QuestionDrawer({ question, inExam, examFull, onToggleExam, onAnswered, onClose }: {
  question: QuestionPublic; inExam: boolean; examFull: boolean; onToggleExam: () => void; onAnswered: (id: string, result: QuestionDrawerAttempt['result']) => void; onClose: () => void;
}) {
  const objective = question.type === 'objective';
  const catalogOnly = isCatalogOnly(question);
  const [selected, setSelected] = useState('');
  const [attempt, setAttempt] = useState<QuestionDrawerAttempt | null>(null);
  const [previous, setPrevious] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState(false);
  const [failedImages, setFailedImages] = useState<Set<string>>(() => new Set());
  const opened = useRef(Date.now());
  const mutation = useRef<string | null>(null);
  const answerFocus = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!objective || catalogOnly) return;
    const controller = new AbortController();
    void getLastAttempt(question.id, controller.signal)
      .then(({ last }) => { if (last && !controller.signal.aborted) { setAttempt(last); setSelected(last.selectedKey); setPrevious(true); } })
      .catch(() => { if (!controller.signal.aborted) setError(t('questionsBank.attemptError')); });
    return () => controller.abort();
  }, [question.id, objective, catalogOnly]);
  useEffect(() => { if (attempt && !previous) answerFocus.current?.focus(); }, [attempt, previous]);

  const submit = async () => {
    if (!selected || busy || catalogOnly) return;
    mutation.current ??= crypto.randomUUID(); // reused when the same submit is retried (idempotent by mutationId)
    setBusy(true); setError(null);
    try {
      const result = await answerQuestion(question.id, { selectedKey: selected, mutationId: mutation.current, elapsedMs: Math.min(86400000, Date.now() - opened.current) });
      mutation.current = null; setPrevious(false); setAttempt(result); onAnswered(question.id, result.result);
    } catch { setError(t('questionsBank.answerError')); } finally { setBusy(false); }
  };
  const redo = () => { setAttempt(null); setPrevious(false); setSelected(''); setError(null); mutation.current = null; opened.current = Date.now(); };
  const alternatives = question.alternatives ?? [];
  const ref = attempt?.reference;
  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }} size="xl" title={t('questionsBank.drawerTitle')} closeLabel={t('common.close')}>
      <div className="flex flex-col gap-5">
        <BankMeta question={question} />
        <p className="whitespace-pre-wrap break-words text-lg leading-relaxed">{question.stem}</p>
        {question.assets.map(asset => <figure key={asset.id} className="min-w-0 space-y-2">
          {failedImages.has(asset.id) ? <Alert tone="watch" title={t('questions.resultImageError')} /> : <img src={asset.url} alt={asset.alt} className="h-auto max-w-full rounded-map border border-border" onError={() => setFailedImages(old => new Set(old).add(asset.id))} />}
          <figcaption className="whitespace-pre-wrap break-words text-sm text-muted">{asset.alt}</figcaption>
        </figure>)}
        {!objective ? <div className="flex flex-col gap-3"><p className="text-muted">{t('questionsBank.discursive')}</p><MapLink question={question} /></div>
          : alternatives.length === 0 ? <p className="text-muted">{t('questionsBank.noAlternatives')}</p>
          : catalogOnly ? <ol className="flex flex-col gap-2">{alternatives.map(a => <li key={a.key} className="whitespace-pre-wrap break-words"><strong>{a.key}. </strong>{a.text}</li>)}</ol>
          : !attempt ? <RadioGroup label={t('questionsBank.alternatives')} value={selected} onValueChange={setSelected} options={alternatives.map((a) => ({ value: a.key, label: `${a.key}. ${a.text}` }))} />
          : <div ref={answerFocus} tabIndex={-1} className="flex flex-col gap-4 outline-none">
            <p role="status" className="font-display text-xl font-bold">{previous ? `${t('questionsBank.previous')}: ` : ''}{t(resultKey[attempt.result])}</p>
            <ol aria-label={t('questionsBank.alternatives')} className="flex flex-col gap-2">{alternatives.map((a) => <li key={a.key} className={`rounded-field border p-3 ${ref?.correctKey === a.key ? 'border-steady bg-steady-bg' : attempt.selectedKey === a.key ? 'border-primary bg-primary-tint' : 'border-border'}`}><span className="font-bold">{a.key}.</span> {a.text}</li>)}</ol>
            {ref?.correctKey ? <p className="font-semibold">{t('questionsBank.correctIs', { key: ref.correctKey })}</p> : null}
            {ref?.explanation ? <section><h3 className="font-bold">{t('questionsBank.explanation')}</h3><p className="whitespace-pre-wrap break-words">{ref.explanation}</p></section> : null}
            {ref?.distractorNotes ? <section><h3 className="font-bold">{t('questionsBank.distractorNotes')}</h3><ul>{Object.entries(ref.distractorNotes).map(([k, note]) => <li key={k}><span className="font-bold">{k}.</span> {note}</li>)}</ul></section> : null}
            {question.sourceLabel ? <p className="text-sm text-muted">{t('questionsBank.sourceLine', { name: question.sourceLabel })}{ref?.referenceDate ? ` · ${t('questionsBank.referenceDate', { date: ref.referenceDate })}` : ''}</p> : null}
            {ref?.sourceUrl ? <a className="font-semibold text-primary-deep underline" href={ref.sourceUrl} target="_blank" rel="noopener noreferrer">{t('questionsBank.sourceLink')}</a> : null}
            {ref?.obsolete ? <p className="text-sm text-muted">{t('questionsBank.obsoleteRef')}</p> : null}
          </div>}
        {error ? <Alert role="alert" tone="review" title={error} /> : null}
        <div className="flex flex-wrap gap-2">
          {objective && !catalogOnly && alternatives.length > 0 ? (attempt ? <Button variant="secondary" onClick={redo}>{t('questionsBank.redo')}</Button> : <Button loading={busy} disabled={!selected} onClick={() => void submit()}>{busy ? t('questionsBank.answering') : t('questionsBank.answer')}</Button>) : null}
          <Button variant="secondary" disabled={!inExam && (examFull || !canSelectQuestion(question))} onClick={onToggleExam}>{inExam ? t('questionsBank.removeFromExam') : t('questionsBank.addToExam')}</Button>
          <Button variant="quiet" onClick={() => setReport(true)}>{t('questionsBank.report')}</Button>
        </div>
      </div>
      {report ? <ReportDialog question={question} open onOpenChange={(v) => { if (!v) setReport(false); }} /> : null}
    </Dialog>
  );
}
