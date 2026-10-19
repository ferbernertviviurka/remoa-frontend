'use client';
import {ClassificationMeta} from './classification-meta';
import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { t } from './labels';
import { QuestionProvenance } from './provenance';
import { TeamDisclosure } from './team-disclosure';
import { startSavedDiscursive } from './api';
import { Alert, Button, Icon, Pill, Tag } from '@remoa/ui';
import type { QuestionPublic } from '@remoa/contracts';
import { questionError } from './api';
import { isInstitutional, ValidationSeal } from './validation-seal';
export const panel = 'rounded-[26px] border border-border bg-surface p-5 md:p-6';
export const heading = 'font-display text-[34px] font-extrabold leading-[1.1] tracking-[-0.03em] md:text-[44px]';
export const actionLink = 'inline-flex min-h-11 items-center justify-center rounded-btn border border-border bg-surface px-4 font-semibold text-primary-deep no-underline focus-visible:outline-2 focus-visible:outline-primary';
export function PageTitle({ title, description, children }: { title: string; description: string; children?: ReactNode }) {
  return <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"><div><p className="mb-3 text-xs font-bold uppercase tracking-[.12em] text-muted">{t('questions.eyebrow')}</p><h1 tabIndex={-1} className={`${heading} outline-none`}>{title}</h1><p className="mt-3 text-muted">{description}</p></div>{children}</header>;
}
export function QuestionMeta({ question: q }: { question: QuestionPublic }) {
  return <div className="flex flex-wrap items-center gap-2"><Pill tone={q.origin === 'ai_generated' ? 'ai' : 'brand'}>{q.origin === 'ai_generated' ? <span className="mr-1 inline-flex"><Icon name="sparkle" size={14} /></span> : null}{t(`questions.source.${q.origin}`)}</Pill><Pill tone="unknown">{t(`questions.visibility.${q.visibility}`)}</Pill><Pill tone="unknown">{t(q.teamDisclosure?.difficultyAssessment==='unassessed'?'questions.difficultyUnassessed':`questions.difficultyLabel.${q.difficulty}`)}</Pill>{isInstitutional(q.validation)?<ValidationSeal validation={q.validation}/>:<span className="text-xs text-muted">{t(q.reviewed ? 'questions.reviewed' : 'questions.unreviewed')}{q.validation?.kind==='medical_review'?` · ${q.validation.label}`:''}</span>}{q.availability !== 'active' ? <Tag tone="review">{t(q.availability === 'annulled' ? 'questions.annulled' : 'questions.unavailable')}</Tag> : null}<QuestionProvenance question={q}/><ClassificationMeta classification={q.classification} kind={q.classificationKind}/><TeamDisclosure question={q}/></div>;
}
export {ConfigDialog,PersonalDialog,ReportDialog} from './lazy-dialogs';
export function MapLink({ question }: { question: QuestionPublic }) {
  const router=useRouter();const[busy,setBusy]=useState(false);const[error,setError]=useState<string|null>(null);
  const start=async()=>{if(!question.boardId)return;setBusy(true);setError(null);try{const result=await startSavedDiscursive(question.id);const [{rememberChallengeAiSession},{aiChallengeHref}]=await Promise.all([import('@/features/challenge-ai/session-screen'),import('@/features/challenge-ai/start-ai')]);rememberChallengeAiSession({...result.session,startedAt:result.session.startedAt.toISOString(),expiresAt:result.session.expiresAt.toISOString()});router.push(aiChallengeHref(question.boardId,result.session.id));}catch(e){setError(questionError(e));}finally{setBusy(false);}};
  if(!question.boardId)return <p className="text-sm text-muted">{t('questions.noMap')}</p>;
  if(question.type!=='discursive')return <Link className={actionLink} href={`/app/mapas/${question.boardId}`}>{t('questions.mapOpen')}</Link>;
  return <div className="space-y-3"><p className="text-sm text-muted">{t('questions.discursiveCost')}</p><Button loading={busy} onClick={()=>void start()}>{t('questions.challengeOpen')}</Button>{error?<Alert role="alert" tone="review" title={error}/>:null}</div>;
}
