'use client';
import Link from 'next/link';
import {useCallback,useEffect,useRef,useState} from 'react';
import type {QuestionAdminCatalogItem,QuestionReviewHistoryItem} from '@remoa/contracts';
import {Alert,Button,Tag} from '@remoa/ui';
import {t} from '@remoa/strings';
import {panel,actionLink} from '@/features/questions/shared';
import {adminQuestionError,tq} from '@/features/admin/questions/labels';
import {getQuestionVersionHistory,getQuestionReviewHistory} from '@/features/admin/questions/catalog-api';
type HistoryPage<T>={items:T[];nextCursor:string|null};
function useHistoryPage<T extends {id:string}>(read:(cursor?:string,signal?:AbortSignal)=>Promise<HistoryPage<T>>){
 const[items,setItems]=useState<T[]>([]);const[cursor,setCursor]=useState<string|null>(null);const[loading,setLoading]=useState(true);const[error,setError]=useState<string|null>(null);const[retry,setRetry]=useState(0);
 const sequence=useRef(0);const controller=useRef<AbortController|null>(null);const pending=useRef(false);
 useEffect(()=>{const generation=++sequence.current;const abort=new AbortController();controller.current=abort;pending.current=true;setLoading(true);setError(null);setItems([]);setCursor(null);
  void read(undefined,abort.signal).then(value=>{if(generation===sequence.current&&!abort.signal.aborted){setItems(value.items);setCursor(value.nextCursor);}}).catch(reason=>{if(generation===sequence.current&&!abort.signal.aborted)setError(adminQuestionError(reason));}).finally(()=>{if(generation===sequence.current&&!abort.signal.aborted){pending.current=false;setLoading(false);}});
  return()=>{controller.current?.abort();sequence.current=generation+1;};
 },[read,retry]);
 const more=async()=>{if(!cursor||pending.current)return;pending.current=true;const generation=sequence.current;const abort=new AbortController();controller.current=abort;setLoading(true);setError(null);
  try{const value=await read(cursor,abort.signal);if(generation!==sequence.current||abort.signal.aborted)return;setItems(previous=>[...new Map([...previous,...value.items].map(item=>[item.id,item])).values()]);setCursor(value.nextCursor);}
  catch(reason){if(generation===sequence.current&&!abort.signal.aborted)setError(adminQuestionError(reason));}
  finally{if(generation===sequence.current&&!abort.signal.aborted){pending.current=false;setLoading(false);}}
 };
 return{items,cursor,loading,error,more,retry:()=>{if(items.length&&cursor)void more();else setRetry(value=>value+1);}};
}
const date=(value:Date)=>value.toLocaleString('pt-BR');
function VersionHistory({id,admin}:{id:string;admin:boolean}){
 const read=useCallback((cursor?:string,signal?:AbortSignal)=>getQuestionVersionHistory(admin,id,{limit:25,...(cursor?{cursor}:{})},signal),[admin,id]);
 const state=useHistoryPage<QuestionAdminCatalogItem>(read);
 return <section aria-label={tq('questionsAdmin.historyVersions')} className="min-w-0 space-y-3"><h3 className="font-display text-lg font-bold">{tq('questionsAdmin.historyVersions')}</h3>
  {!state.loading&&!state.error&&!state.items.length?<p>{tq('questionsAdmin.historyNoVersions')}</p>:null}
  {state.items.map(item=><article key={item.id} className={`${panel} min-w-0 space-y-2`}><div className="flex flex-wrap gap-2"><Tag>{tq('questionsAdmin.publicVersion',{n:item.version})}</Tag><Tag tone="unknown">{tq(`questionsAdmin.catalogStatuses.${item.catalogStatus}`)}</Tag><Tag tone="unknown">{tq(`questionsAdmin.catalogAvailability.${item.availability}`)}</Tag>{item.id===id?<Tag>{tq('questionsAdmin.historyCurrent')}</Tag>:null}</div><p className="whitespace-pre-wrap break-words">{item.stemPreview}</p><p className="break-words text-sm text-muted">{item.sourceLabel??tq('questionsAdmin.catalogUnknownSource')}</p><p className="text-sm">{tq('questionsAdmin.historyCreated',{date:date(item.createdAt)})}</p><p className="text-sm">{tq('questionsAdmin.historyUpdated',{date:date(item.updatedAt)})}</p>{item.publishedAt?<p className="text-sm">{tq('questionsAdmin.historyPublished',{date:date(item.publishedAt)})}</p>:null}{item.supersedesId?<Link className={actionLink} href={`/app/editorial/questoes/${item.supersedesId}`}>{tq('questionsAdmin.historyPrevious')}</Link>:null}<Link className={actionLink} href={`/app/editorial/questoes/${item.id}`}>{tq('questionsAdmin.historyOpenVersion',{n:item.version})}</Link></article>)}
  {state.loading?<p role="status">{t('common.loading')}</p>:null}{state.error?<Alert role="alert" tone="review" title={state.error}><Button variant="secondary" onClick={state.retry}>{t('common.retry')}</Button></Alert>:null}{state.cursor?<Button variant="secondary" loading={state.loading} onClick={()=>void state.more()}>{tq('questionsAdmin.historyMoreVersions')}</Button>:null}
 </section>;
}
function ReviewHistory({id,admin}:{id:string;admin:boolean}){
 const read=useCallback((cursor?:string,signal?:AbortSignal)=>getQuestionReviewHistory(admin,id,{limit:25,...(cursor?{cursor}:{})},signal),[admin,id]);
 const state=useHistoryPage<QuestionReviewHistoryItem>(read);
 return <section aria-label={tq('questionsAdmin.historyReviews')} className="min-w-0 space-y-3"><h3 className="font-display text-lg font-bold">{tq('questionsAdmin.historyReviews')}</h3><p className="text-sm text-muted">{tq('questionsAdmin.historyReviewsHelp')}</p>
  {!state.loading&&!state.error&&!state.items.length?<p>{tq('questionsAdmin.historyNoReviews')}</p>:null}
  {state.items.map(item=><article key={item.id} className={`${panel} min-w-0 space-y-2`}><Tag tone="unknown">{tq(`questionsAdmin.historyDecisions.${item.decision}`)}</Tag><p className="break-words">{item.reviewerName} · {item.reviewerCrm}</p><p className="text-sm">{tq('questionsAdmin.historyReviewAt',{date:date(item.reviewedAt)})}</p><p className="text-sm">{tq('questionsAdmin.referenceDate')}: {item.referenceDate}</p><p className="break-all text-xs">{tq('questionsAdmin.historyReviewHash',{hash:item.contentHash})}</p><p className="whitespace-pre-wrap break-words">{tq('questionsAdmin.historyReason')}: {item.reason}</p></article>)}
  {state.loading?<p role="status">{t('common.loading')}</p>:null}{state.error?<Alert role="alert" tone="review" title={state.error}><Button variant="secondary" onClick={state.retry}>{t('common.retry')}</Button></Alert>:null}{state.cursor?<Button variant="secondary" loading={state.loading} onClick={()=>void state.more()}>{tq('questionsAdmin.historyMoreReviews')}</Button>:null}
 </section>;
}
export function QuestionHistory({id,admin,enabled}:{id:string;admin:boolean;enabled:boolean}){
 const[open,setOpen]=useState(false);
 if(!enabled)return null;
 return <section aria-label={tq('questionsAdmin.historyTitle')} className="min-w-0 space-y-5"><h2 className="font-display text-xl font-bold">{tq('questionsAdmin.historyTitle')}</h2><Button variant="secondary" aria-expanded={open} onClick={()=>setOpen(value=>!value)}>{tq(open?'questionsAdmin.historyClose':'questionsAdmin.historyOpen')}</Button>{open?<div key={`${admin}:${id}`} className="min-w-0 space-y-8"><VersionHistory id={id} admin={admin}/><ReviewHistory id={id} admin={admin}/></div>:null}</section>;
}
