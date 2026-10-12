'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import type {QuestionGenerationMetrics} from '@remoa/contracts';
import {Alert,Button,Empty,Input,Select,SkeletonBlock,SkeletonRegion,Tag} from '@remoa/ui';
import {t} from '@remoa/strings';
import {panel} from '@/features/questions/shared';
import {AdminQuestionTabs,AdminQuestionTitle} from './admin-shared';
import {getGenerationMetrics,listGenerationOutbox} from './operations-api';
import {OutboxRecoverDialog} from './outbox-recover-dialog';
import type {QuestionAdminOutboxItem} from './operations-types';
import {adminQuestionError,tq} from './labels';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const states=['exhausted','pending','leased','delivered'] as const;
const targets=['question-receipt','question-promotion'] as const;
const money=(cents:number)=>(cents/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const when=(d:Date)=>new Date(d).toLocaleString('pt-BR');

function Metrics(){
 const[data,setData]=useState<QuestionGenerationMetrics|null>(null);const[error,setError]=useState<string|null>(null);const[retry,setRetry]=useState(0);
 useEffect(()=>{const abort=new AbortController();setError(null);getGenerationMetrics(24,abort.signal).then(setData).catch(e=>{if(!abort.signal.aborted)setError(adminQuestionError(e));});return()=>abort.abort();},[retry]);
 if(error)return <Alert role="alert" tone="review" title={error}><Button variant="secondary" onClick={()=>setRetry(v=>v+1)}>{t('common.retry')}</Button></Alert>;
 if(!data)return <SkeletonRegion label={t('common.loading')}><SkeletonBlock height={148} radius={24}/></SkeletonRegion>;
 const c=data.cost;
 return <section aria-labelledby="ops-metrics" className="grid gap-5 lg:grid-cols-3"><h2 id="ops-metrics" className="sr-only">{tq('questionsAdmin.opsMetrics')}</h2>
  {data.backlog.map(b=>{const th=data.throughput.find(x=>x.target===b.target);return <article key={b.target} className={`${panel} space-y-2`}><h3 className="font-semibold">{tq(`questionsAdmin.opsTargets.${b.target}`)}</h3>
   <p>{tq('questionsAdmin.opsBacklog',{pending:b.pending,leased:b.leased,exhausted:b.exhausted})}</p>
   <p className="text-sm text-muted">{b.oldestPendingAt?tq('questionsAdmin.opsOldest',{date:when(b.oldestPendingAt)}):tq('questionsAdmin.opsNoOldest')}</p>
   {th?<p className="text-sm text-muted">{tq('questionsAdmin.opsThroughput',{delivered:th.delivered,recovered:th.recovered})} · {tq('questionsAdmin.opsWindowHours',{n:data.windowHours})}</p>:null}</article>;})}
  <article className={`${panel} space-y-2`}><h3 className="font-semibold">{tq('questionsAdmin.opsCost')}</h3><p className="text-sm text-muted">{tq('questionsAdmin.opsCostRuns',{n:c.runs})}</p>
   <p>{tq('questionsAdmin.opsCostKnown',{value:money(c.knownCostCents),n:c.runsWithKnownCost})}</p>
   <p className={c.runsWithUnknownCost?'font-semibold':'text-sm text-muted'}>{tq('questionsAdmin.opsCostUnknown',{n:c.runsWithUnknownCost})}</p></article>
 </section>;
}

export function GenerationOpsScreen(){
 const[state,setState]=useState<string>('exhausted');const[target,setTarget]=useState('all');const[owner,setOwner]=useState('');
 const[items,setItems]=useState<QuestionAdminOutboxItem[]>([]);const[cursor,setCursor]=useState<string|null>(null);const[loading,setLoading]=useState(true);const[more,setMore]=useState(false);const[error,setError]=useState<string|null>(null);const[retry,setRetry]=useState(0);
 const[selected,setSelected]=useState<Map<string,QuestionAdminOutboxItem>>(new Map());const[recovering,setRecovering]=useState(false);
 const ownerId=owner.trim();const ownerBad=Boolean(ownerId)&&!uuid.test(ownerId);
 const query=useCallback((c?:string)=>({state:state as typeof states[number],...(target!=='all'?{target:target as typeof targets[number]}:{}),...(ownerId&&!ownerBad?{ownerId}:{}),limit:25,...(c?{cursor:c}:{})}),[state,target,ownerId,ownerBad]);
 const seq=useRef(0);
 useEffect(()=>{const gen=++seq.current;const abort=new AbortController();setItems([]);setCursor(null);setError(null);setSelected(new Map());setLoading(true);
  listGenerationOutbox(query(),abort.signal).then(v=>{if(gen===seq.current){setItems(v.items);setCursor(v.nextCursor);}}).catch(e=>{if(gen===seq.current&&!abort.signal.aborted)setError(adminQuestionError(e));}).finally(()=>{if(gen===seq.current)setLoading(false);});
  return()=>abort.abort();},[query,retry]);
 const loadMore=async()=>{if(!cursor||more)return;const gen=seq.current;setMore(true);setError(null);
  try{const v=await listGenerationOutbox(query(cursor));if(gen!==seq.current)return;setItems(old=>[...new Map([...old,...v.items].map(i=>[i.outboxId,i])).values()]);setCursor(v.nextCursor);}
  catch(e){if(gen===seq.current)setError(adminQuestionError(e));}finally{setMore(false);}};
 return <div className="flex flex-col gap-6 p-5 md:p-9"><AdminQuestionTitle title={tq('questionsAdmin.opsTitle')} description={tq('questionsAdmin.opsDescription')}/><AdminQuestionTabs/>
  <Metrics/>
  <section aria-labelledby="ops-list" className="min-w-0 space-y-5"><h2 id="ops-list" className="font-display text-2xl font-bold">{tq('questionsAdmin.opsListTitle')}</h2>
   <div className="grid min-w-0 gap-4 md:grid-cols-3">
    <Select label={tq('questionsAdmin.opsState')} value={state} onValueChange={setState} options={states.map(value=>({value,label:tq(`questionsAdmin.opsStates.${value}`)}))}/>
    <Select label={tq('questionsAdmin.opsTarget')} value={target} onValueChange={setTarget} options={[{value:'all',label:tq('questionsAdmin.opsAllTargets')},...targets.map(value=>({value,label:tq(`questionsAdmin.opsTargets.${value}`)}))]}/>
    <Input label={tq('questionsAdmin.opsOwner')} value={owner} maxLength={36} onChange={e=>setOwner(e.target.value)} aria-invalid={ownerBad}/>
   </div>
   {ownerBad?<p role="alert" className="text-sm text-review-text">{tq('questionsAdmin.opsOwnerInvalid')}</p>:null}
   {state==='exhausted'?<div className="flex flex-wrap items-center gap-3"><span role="status" className="text-sm">{tq('questionsAdmin.opsSelected',{n:selected.size})}</span><Button disabled={!selected.size} onClick={()=>setRecovering(true)}>{tq('questionsAdmin.opsRecover')}</Button></div>:null}
   {loading?<SkeletonRegion label={t('common.loading')}><SkeletonBlock height={96} radius={24}/></SkeletonRegion>:!items.length&&!error?<Empty title={tq('questionsAdmin.opsEmpty')}/>:items.map(i=><article key={i.outboxId} className={`${panel} min-w-0 space-y-2`}>
    {i.state==='exhausted'?<label className="flex min-h-11 items-center gap-3"><input type="checkbox" className="size-5" aria-label={tq('questionsAdmin.opsSelect',{id:i.outboxId})} checked={selected.has(i.outboxId)} disabled={!selected.has(i.outboxId)&&selected.size>=50} onChange={e=>setSelected(old=>{const next=new Map(old);if(e.target.checked)next.set(i.outboxId,i);else next.delete(i.outboxId);return next;})}/></label>:null}
    <div className="flex flex-wrap gap-2"><Tag tone={i.state==='exhausted'?'review':'unknown'}>{tq(`questionsAdmin.opsStates.${i.state}`)}</Tag><Tag>{tq(`questionsAdmin.opsTargets.${i.target}`)}</Tag></div>
    <p className="break-all text-sm">{i.outboxId}</p><p className="text-sm text-muted">{tq('questionsAdmin.opsAttempts',{attempts:i.attempts,limit:i.attemptLimit})}{i.errorCode?` · ${tq('questionsAdmin.opsError',{code:i.errorCode})}`:''}</p><p className="text-sm text-muted">{when(i.updatedAt)}</p>
   </article>)}
   {error?<Alert role="alert" tone="review" title={error}><Button variant="secondary" onClick={()=>{if(items.length&&cursor)void loadMore();else setRetry(v=>v+1);}}>{t('common.retry')}</Button></Alert>:null}
   {cursor?<Button variant="secondary" loading={more} disabled={loading} onClick={()=>void loadMore()}>{tq('questionsAdmin.opsMore')}</Button>:null}
  </section>
  {recovering?<OutboxRecoverDialog items={[...selected.values()]} onClose={()=>setRecovering(false)} onDone={()=>{setSelected(new Map());setRetry(v=>v+1);}}/>:null}
 </div>;
}
