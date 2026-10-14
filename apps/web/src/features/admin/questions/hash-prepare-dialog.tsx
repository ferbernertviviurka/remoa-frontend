'use client';
import {useEffect,useRef,useState} from 'react';
import type {QuestionAdminCatalogItem,QuestionHashPrepareResult,QuestionSource} from '@remoa/contracts';
import {Alert,Button,Dialog,Select,Tag,Textarea} from '@remoa/ui';
import {t} from '@remoa/strings';
import {listSources} from './api';
import {prepareContentHashes} from './operations-api';
import {batchCount,runBatches} from './batches';
import {adminQuestionError,tq} from './labels';
import {QuestionsApiError} from '@/features/questions/request';

/** D-1804, D-1840. Mounted per selection, any size: sent 500 per call, one after another; a failure resumes from that batch with its key. */
export function HashPrepareDialog({items,onClose,onDone}:{items:QuestionAdminCatalogItem[];onClose:()=>void;onDone:()=>void}){
 const keys=useRef<string[]>([]);const[reason,setReason]=useState('');const[sourceId,setSourceId]=useState('none');const[sources,setSources]=useState<QuestionSource[]>([]);
 const[busy,setBusy]=useState(false);const[error,setError]=useState<string|null>(null);const[failed,setFailed]=useState(false);const[results,setResults]=useState<QuestionHashPrepareResult['results']>([]);const[done,setDone]=useState(0);const total=batchCount(items.length);const finished=done>=total;
 useEffect(()=>{let live=true;void listSources().then(v=>{if(live)setSources(v.items);}).catch(()=>undefined);return()=>{live=false;};},[]);
 const edit=(apply:()=>void)=>{apply();keys.current=keys.current.slice(0,done);setFailed(false);setError(null);};
 const submit=async()=>{if(busy||reason.trim().length<8)return;setBusy(true);setError(null);
  try{await runBatches(items,keys.current,done,(chunk,key)=>prepareContentHashes({items:chunk.map(i=>({id:i.id,revision:i.version,expectedUpdatedAt:i.updatedAt})),sourceId:sourceId==='none'?null:sourceId,idempotencyKey:key,reason:reason.trim()}),(d,r)=>{setDone(d);setResults(old=>[...old,...r]);});}
  catch(e){setFailed(true);setError(e instanceof QuestionsApiError&&e.code==='internal'?tq('questionsAdmin.hashNetwork'):adminQuestionError(e));}
  finally{setBusy(false);}};
 const finish=()=>{if(done)onDone();onClose();};
 const ok=results.filter(r=>r.outcome==='prepared'||r.outcome==='already_prepared').length;const pending=results.filter(r=>r.outcome!=='prepared'&&r.outcome!=='already_prepared');
 const byId=new Map(items.map(i=>[i.id,i]));
 return <Dialog open onOpenChange={open=>{if(!open&&!busy)finish();}} closeLabel={t('common.close')} title={tq('questionsAdmin.hashTitle')} description={tq('questionsAdmin.hashDescription',{n:items.length})}>
  {finished?<div className="flex flex-col gap-4">
   <h3 className="font-semibold">{tq('questionsAdmin.hashResultTitle')}</h3>
   <p role="status" className="text-sm">{tq('questionsAdmin.hashSummary',{ok,failed:pending.length})}</p>
   <ul className="flex max-h-80 flex-col gap-3 overflow-auto">{pending.slice(0,100).map(r=><li key={r.id} className="flex flex-col gap-1 border-t border-border pt-3"><Tag tone="review">{tq(`questionsAdmin.hashOutcomes.${r.outcome}`)}</Tag><span className="break-words text-sm text-muted">{byId.get(r.id)?.stemPreview??r.id}</span></li>)}</ul>
   <Button onClick={finish}>{tq('questionsAdmin.hashDone')}</Button>
  </div>:<div className="flex flex-col gap-5">
   <Alert tone="watch" title={tq('questionsAdmin.hashNotApproval')}/>
   <Select label={tq('questionsAdmin.hashSource')} value={sourceId} onValueChange={v=>edit(()=>setSourceId(v))} options={[{value:'none',label:tq('questionsAdmin.hashNoSource')},...sources.map(s=>({value:s.id,label:s.name}))]}/>
   <p className="text-xs text-muted">{tq('questionsAdmin.hashSourceHelp')}</p>
   <Textarea label={tq('questionsAdmin.reason')} minLength={8} maxLength={500} value={reason} onChange={e=>edit(()=>setReason(e.target.value))}/>
   <p className="text-xs text-muted">{tq('questionsAdmin.reasonHelp')}</p>
   {total>1?<p role="status" className="text-sm">{tq('questionsAdmin.batchProgress',{done,total})}</p>:null}
   {error?<Alert role="alert" tone="review" title={error}>{failed?<p className="text-sm">{tq('questionsAdmin.hashRetryHelp')}</p>:null}</Alert>:null}
   <Button loading={busy} disabled={reason.trim().length<8} onClick={()=>void submit()}>{failed?tq('questionsAdmin.hashRetry'):tq('questionsAdmin.hashConfirm',{n:items.length})}</Button>
  </div>}
 </Dialog>;
}
