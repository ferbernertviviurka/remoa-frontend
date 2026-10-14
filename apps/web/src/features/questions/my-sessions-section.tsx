'use client';
import Link from 'next/link';
import {useEffect,useState} from 'react';
import type {QuestionSessionsPageResult} from '@remoa/contracts';
import {Alert,Button,Tag} from '@remoa/ui';
import {t} from './labels';
import {questionError} from './api';
import {listSessionHistory} from './session-history-api';
import {actionLink,panel} from './shared';
/** Provas e simulados que o aluno já começou (em andamento ou concluídos), com link para retomar ou ver o resultado. */
export function MySessionsSection(){
 const[items,setItems]=useState<QuestionSessionsPageResult['items']>([]);const[loading,setLoading]=useState(true);const[error,setError]=useState<string|null>(null);const[version,setVersion]=useState(0);
 useEffect(()=>{const abort=new AbortController();setLoading(true);setError(null);void listSessionHistory({limit:20},abort.signal).then(r=>{if(!abort.signal.aborted)setItems(r.items);}).catch(e=>{if(!abort.signal.aborted)setError(questionError(e));}).finally(()=>{if(!abort.signal.aborted)setLoading(false);});return()=>abort.abort();},[version]);
 if(loading)return null;
 return <section aria-labelledby="my-sessions-title" className="flex flex-col gap-4"><h2 id="my-sessions-title" className="font-display text-2xl font-extrabold">{t('questions.mySessions')}</h2>
  {error?<Alert role="alert" tone="review" title={error}><Button variant="secondary" onClick={()=>setVersion(v=>v+1)}>{t('common.retry')}</Button></Alert>:!items.length?<p className="text-muted">{t('questions.mySessionsEmpty')}</p>:<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{items.map(s=><article key={s.id} data-session-id={s.id} className={`${panel} flex min-w-0 flex-col gap-3`}><div><Tag tone={s.status==='active'?'brand':'unknown'}>{t(`questions.${s.status}`)}</Tag></div><h3 className="font-display text-xl font-bold">{t(s.mode==='study'?'questions.study':'questions.simulation')}</h3><p className="text-sm text-muted">{t(s.answeredCount===1?'questions.answeredOne':'questions.answered',{n:s.answeredCount})} · {t('questions.examCount',{n:s.count})}</p><p className="text-sm text-muted">{t('questions.historyStarted',{date:s.startedAt.toLocaleString('pt-BR')})}</p><Link className={actionLink} href={`/app/simulados/${s.id}`}>{t(s.status==='active'?'questions.continue':'questions.openResult')}</Link></article>)}</div>}
  <Link className={actionLink} href="/app/simulados">{t('questions.mySessionsAll')}</Link></section>;
}
