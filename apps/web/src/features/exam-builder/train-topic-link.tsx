'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {readSharedQuestionFeatureFlags} from '@/features/questions/flags';
import {t} from './labels';
import {actionLink} from '../questions/shared';

/** True only once the API says the bankStudent flag is open, so a closed flag never shows an entry to a 404. */
export function useBankStudentOpen(){
  const [open,setOpen]=useState(false);
  useEffect(()=>{let live=true;readSharedQuestionFeatureFlags().then(f=>live&&setOpen(f.bankStudent&&f.catalog));return()=>{live=false;};},[]);
  return open;
}

export const trainTopicHref=(matrixItemId:string)=>`/app/banco-de-questoes/prova?matrixItemIds=${encodeURIComponent(matrixItemId)}`;

/** FR-37/38 entry point. */
export function TrainTopicLink({href,kind}:{href:string;kind:'topic'|'byTopic'}){
  if(!useBankStudentOpen())return null;
  return <Link href={href} className="inline-flex min-h-11 items-center rounded-btn border border-border-strong px-4 text-[15px] font-bold text-primary-deep">{t(kind==='topic'?'examBuilder.trainTopic':'examBuilder.trainByTopic')}</Link>;
}

/** The single entry to "Gerar com IA" (G29): the Criador de prova starting on the AI origin. Replaces the old GenerateExamDialog. */
export const aiExamHref='/app/banco-de-questoes/prova?source=ai';
export function AiExamLink(){
  return <Link href={aiExamHref} className={actionLink}>{t('examBuilder.generateAi')}</Link>;
}
