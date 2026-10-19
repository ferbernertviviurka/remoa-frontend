'use client';
import Link from 'next/link';
import {useEffect,useState} from 'react';
import type {QuestionSessionsPageResult} from '@remoa/contracts';
import {Alert,Button,Icon,Tag,buttonVariants,focusRing} from '@remoa/ui';
import {t} from './labels';
import {questionError} from './api';
import {listSessionHistory} from './session-history-api';
import {QuestionsSkeleton} from './questions-skeleton';
const linkStyle=`${focusRing} inline-flex min-h-11 items-center justify-center gap-2 rounded-btn px-4 text-sm`;
/** Session history loads independently of official papers; a paper failure must not hide saved work. */
export function MySessionsSection(){
 const[items,setItems]=useState<QuestionSessionsPageResult['items']>([]);const[loading,setLoading]=useState(true);const[error,setError]=useState<string|null>(null);const[version,setVersion]=useState(0);
 useEffect(()=>{const abort=new AbortController();setLoading(true);setError(null);void listSessionHistory({limit:20},abort.signal).then(r=>{if(!abort.signal.aborted)setItems(r.items);}).catch(e=>{if(!abort.signal.aborted)setError(questionError(e));}).finally(()=>{if(!abort.signal.aborted)setLoading(false);});return()=>abort.abort();},[version]);
 const ordered=[...items].sort((a,b)=>Number(b.status==='active')-Number(a.status==='active')||b.startedAt.getTime()-a.startedAt.getTime());
 return <section aria-labelledby="my-sessions-title" className="min-w-0"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h2 id="my-sessions-title" className="font-display text-2xl font-extrabold">{t('questions.mySessions')}</h2><p className="mt-1 text-sm text-muted">{t('questions.examsHistoryHelp')}</p></div><Link className={`${linkStyle} ${buttonVariants.quiet}`} href="/app/simulados">{t('questions.mySessionsAll')}<Icon name="right" size={18}/></Link></div>
  {error?<div className="mb-4"><Alert role="alert" tone="review" title={t('questions.examsHistoryError')}><p>{error}</p><Button variant="secondary" onClick={()=>setVersion(v=>v+1)}>{t('common.retry')}</Button></Alert></div>:null}
  {loading?<QuestionsSkeleton cards={1}/>:!items.length&&!error?<div className="flex flex-wrap items-center justify-between gap-4 rounded-[26px] border border-dashed border-border-strong bg-surface p-6"><div><p className="font-bold">{t('questions.mySessionsEmpty')}</p><p className="mt-1 text-sm text-muted">{t('questions.examsFirstSessionHelp')}</p></div><Icon name="clock" size={28} className="text-muted"/></div>:null}
  {!loading&&ordered.length>0?<div className="overflow-hidden rounded-[26px] border border-border bg-surface">{ordered.slice(0,5).map(s=><article key={s.id} data-session-id={s.id} className="flex min-w-0 flex-col items-start justify-between gap-4 border-b sm:flex-row sm:items-center border-border p-5 last:border-b-0 md:px-6"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-display text-lg font-bold">{t(s.mode==='study'?'questions.study':'questions.simulation')}</h3><Tag tone={s.status==='active'?'brand':'unknown'}>{t(`questions.${s.status}`)}</Tag></div><p className="mt-2 text-sm text-muted">{t(s.answeredCount===1?'questions.answeredOne':'questions.answered',{n:s.answeredCount})} · {t('questions.examCount',{n:s.count})}</p><p className="mt-1 text-xs text-muted">{t('questions.historyStarted',{date:s.startedAt.toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'})})}</p></div><Link className={`${linkStyle} ${s.status==='active'?buttonVariants.primary:buttonVariants.secondary}`} href={`/app/simulados/${s.id}`}>{t(s.status==='active'?'questions.continue':'questions.openResult')}<Icon name="right" size={18}/></Link></article>)}</div>:null}
 </section>;
}
