'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {api} from '@/lib/api';
import {t} from './labels';

/** True only once the API says the bankStudent flag is open, so a closed flag never shows an entry to a 404. */
export function useBankStudentOpen(){
  const [open,setOpen]=useState(false);
  useEffect(()=>{let live=true;api<{bankStudent?:boolean}>('/v1/question-features').then(r=>live&&r.ok&&setOpen(r.data.bankStudent===true)).catch(()=>undefined);return()=>{live=false;};},[]);
  return open;
}

export const trainTopicHref=(matrixItemId:string)=>`/app/banco-de-questoes/prova?matrixItemIds=${encodeURIComponent(matrixItemId)}`;

/** FR-37/38 entry point. */
export function TrainTopicLink({href,kind}:{href:string;kind:'topic'|'byTopic'}){
  if(!useBankStudentOpen())return null;
  return <Link href={href} className="inline-flex min-h-11 items-center rounded-btn border border-border-strong px-4 text-[15px] font-bold text-primary-deep">{t(kind==='topic'?'examBuilder.trainTopic':'examBuilder.trainByTopic')}</Link>;
}
