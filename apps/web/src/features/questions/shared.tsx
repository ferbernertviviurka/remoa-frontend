'use client';
import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { t } from './labels';
import { QuestionProvenance } from './provenance';
import { startSavedDiscursive } from './api';
import { Alert, Button, Tag } from '@remoa/ui';
import type { QuestionPublic } from '@remoa/contracts';
import { questionError } from './api';
export const panel = 'rounded-[26px] border border-border bg-surface p-5 md:p-6';
export const heading = 'font-display text-[34px] font-extrabold leading-[1.1] tracking-[-0.03em] md:text-[44px]';
export const actionLink = 'inline-flex min-h-11 items-center justify-center rounded-btn border border-border bg-surface px-4 font-semibold text-primary-deep no-underline focus-visible:outline-2 focus-visible:outline-primary';
export function PageTitle({ title, description, children }: { title: string; description: string; children?: ReactNode }) {
  return <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"><div><p className="mb-3 text-xs font-bold uppercase tracking-[.12em] text-muted">{t('questions.eyebrow')}</p><h1 tabIndex={-1} className={`${heading} outline-none`}>{title}</h1><p className="mt-3 text-muted">{description}</p></div>{children}</header>;
}
export function QuestionMeta({ question: q }: { question: QuestionPublic }) {
  return <div className="flex flex-wrap items-center gap-2"><Tag tone={q.origin === 'ai_generated' ? 'review' : 'brand'}>{t(`questions.source.${q.origin}`)}</Tag><Tag tone="unknown">{t(`questions.visibility.${q.visibility}`)}</Tag><span className="text-xs text-muted">{t(`questions.difficultyLabel.${q.difficulty}`)}</span><span className="text-xs text-muted">{t(q.reviewed ? 'questions.reviewed' : 'questions.unreviewed')}</span>{q.availability !== 'active' ? <Tag tone="review">{t(q.availability === 'annulled' ? 'questions.annulled' : 'questions.unavailable')}</Tag> : null}<QuestionProvenance question={q}/></div>;
}
export {ConfigDialog,PersonalDialog,ReportDialog} from './lazy-dialogs';
export function MapLink({ question }: { question: QuestionPublic }) {
  const router=useRouter();const[busy,setBusy]=useState(false);const[error,setError]=useState<string|null>(null);
  const start=async()=>{if(!question.boardId)return;setBusy(true);setError(null);try{const result=await startSavedDiscursive(question.id);const [{rememberChallengeAiSession},{aiChallengeHref}]=await Promise.all([import('@/features/challenge-ai/session-screen'),import('@/features/challenge-ai/start-ai')]);rememberChallengeAiSession({...result.session,startedAt:result.session.startedAt.toISOString(),expiresAt:result.session.expiresAt.toISOString()});router.push(aiChallengeHref(question.boardId,result.session.id));}catch(e){setError(questionError(e));}finally{setBusy(false);}};
  if(!question.boardId)return <p className="text-sm text-muted">{t('questions.noMap')}</p>;
  if(question.type!=='discursive')return <Link className={actionLink} href={`/app/mapas/${question.boardId}`}>{t('questions.mapOpen')}</Link>;
  return <div className="space-y-3"><p className="text-sm text-muted">{t('questions.discursiveCost')}</p><Button loading={busy} onClick={()=>void start()}>{t('questions.challengeOpen')}</Button>{error?<Alert role="alert" tone="review" title={error}/>:null}</div>;
}
