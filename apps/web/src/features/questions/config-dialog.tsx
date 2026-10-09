'use client';
import {useRef,useState} from 'react';
import {useRouter} from 'next/navigation';
import {Alert,Button,Dialog,Input,Select,Tag} from '@remoa/ui';
import type {QuestionListQuery,QuestionPublic,QuestionSessionConfig} from '@remoa/contracts';
import {t} from './labels';
import {createSession,questionError} from './api';
export function ConfigDialog({ filters, question, examId, count: initialCount, timerSec, open, onOpenChange }: { filters?: Partial<QuestionListQuery>; question?: QuestionPublic; examId?: string; count?: number; timerSec?: number | null; open: boolean; onOpenChange: (v: boolean) => void }) {
  const router = useRouter(); const [mode, setMode] = useState<'study' | 'simulation'>(examId ? 'simulation' : 'study'); const [count, setCount] = useState(initialCount ?? (question ? 1 : 10)); const [minutes, setMinutes] = useState(timerSec ? Math.ceil(timerSec / 60) : 0); const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null); const pending = useRef<{ signature: string; key: string } | null>(null);
  const start = async () => {
    const config: QuestionSessionConfig = { mode, count, timerSec: minutes ? minutes * 60 : null, shuffle: false, ...(examId ? { examId } : question ? { questionIds: [question.id] } : { filters: { scope: 'all', limit: 25, ...filters } }) };
    const signature = JSON.stringify(config); if (pending.current?.signature !== signature) pending.current = { signature, key: crypto.randomUUID() };
    setBusy(true); setError(null);
    try { const session = await createSession(config, pending.current.key); router.push(`/app/simulados/${session.id}`); onOpenChange(false); }
    catch (e) { setError(questionError(e)); } finally { setBusy(false); }
  };
  return <Dialog open={open} onOpenChange={v => { if (!busy) onOpenChange(v); }} title={t('questions.configTitle')} description={t('questions.configDescription')} closeLabel={t('common.close')}><div className="flex flex-col gap-5"><Select label={t('questions.mode')} value={mode} onValueChange={v => setMode(v as typeof mode)} options={[{ value: 'study', label: t('questions.study') }, { value: 'simulation', label: t('questions.simulation') }]} /><p className="text-sm text-muted">{t(mode === 'study' ? 'questions.studyDescription' : 'questions.simulationDescription')}</p><Input label={t('questions.countLabel')} type="number" min={1} max={question ? 1 : 200} value={count} readOnly={Boolean(examId)} onChange={e => setCount(Number(e.target.value))} /><Input label={t('questions.duration')} type="number" min={0} max={1440} value={minutes} onChange={e => setMinutes(Number(e.target.value))} /><p className="text-sm text-muted">{minutes ? t('questions.durationHelp') : t('questions.noTimer')}</p><Tag>{t(examId ? 'questions.original' : 'questions.filtered')}</Tag>{error ? <Alert tone="review" role="alert" title={error} /> : null}<Button loading={busy} loadingLabel={t('questions.starting')} disabled={!Number.isInteger(count) || count < 1 || count > 200 || Boolean(question && count !== 1) || !Number.isInteger(minutes) || minutes < 0 || minutes > 1440} onClick={() => void start()}>{t('questions.start')}</Button></div></Dialog>;
}
