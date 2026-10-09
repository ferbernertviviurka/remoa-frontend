'use client';
import {useState} from 'react';
import {Alert,Button,Dialog,Select,Textarea} from '@remoa/ui';
import type {QuestionPublic} from '@remoa/contracts';
import {t} from './labels';
import {questionError,reportQuestion} from './api';
export function ReportDialog({ question, open, onOpenChange }: { question: QuestionPublic; open: boolean; onOpenChange: (v: boolean) => void }) {
  const [kind, setKind] = useState('statement'); const [text, setText] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null); const [sent, setSent] = useState(false);
  const send = async () => { setBusy(true); setError(null); try { await reportQuestion(question.id, question.version, kind, text.trim()); setSent(true); } catch(e) { setError(questionError(e)); } finally { setBusy(false); } };
  return <Dialog open={open} onOpenChange={onOpenChange} title={t('questions.reportTitle')} description={t('questions.reportDescription')} closeLabel={t('common.close')}><div className="flex flex-col gap-4">{sent ? <p role="status">{t('questions.reportSent')}</p> : <><Select label={t('questions.reportType')} value={kind} onValueChange={setKind} options={(['key','statement','image','explanation','rights','other'] as const).map(value => ({ value, label: t(`questions.reportKinds.${value}`) }))} /><Textarea label={t('questions.reportText')} value={text} minLength={8} maxLength={3000} onChange={e => setText(e.target.value)} /><p className="text-xs text-muted">{t('questions.reportMin')}</p><Button loading={busy} disabled={text.trim().length < 8} onClick={() => void send()}>{t('questions.reportSend')}</Button></>}{error ? <Alert role="alert" tone="review" title={error} /> : null}</div></Dialog>;
}
