'use client';
import Link from 'next/link';
import type { QuestionPublic } from '@remoa/contracts';
import { t } from './labels';

export function QuestionProvenance({question}:{question:QuestionPublic}){
 const occurrences=question.occurrences;
 if(!question.sourceLabel&&!occurrences?.items.length)return null;
 return <div className="basis-full min-w-0 text-sm text-muted break-words">
  {question.sourceLabel?<p>{t('questions.sourceLabel',{name:question.sourceLabel})}</p>:null}
  {occurrences?.items.length?<details className="mt-2">
   <summary className="min-h-11 cursor-pointer py-3 font-semibold text-primary-deep">{t(occurrences.total===1?'questions.occurrenceOne':'questions.occurrences',{n:occurrences.total})}</summary>
   <ul className="space-y-3">{occurrences.items.map((item,i)=><li key={`${item.examId}:${item.ordinal}:${i}`} className="rounded-card border border-border p-3">
    <Link href={`/app/provas/${item.examId}`} className="block min-h-11 break-words py-3 font-semibold text-primary-deep">{item.name}</Link>
    <p>{item.institution} · {item.year}</p>
    <p>{t('questions.edition',{name:item.edition})} · {t('questions.booklet',{name:item.booklet})} · {t('questions.originalNumber',{n:item.originalNumber})}</p>
    <p>{t('questions.sourceLabel',{name:item.sourceLabel})}</p>
   </li>)}</ul>
   {occurrences.truncated?<p className="mt-3">{t('questions.occurrencesLimited',{shown:occurrences.items.length,total:occurrences.total})}</p>:null}
  </details>:null}
 </div>;
}
