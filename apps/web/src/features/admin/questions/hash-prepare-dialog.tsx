'use client';
import {useEffect,useState} from 'react';
import type {QuestionAdminCatalogItem,QuestionHashPrepareResult,QuestionSource} from '@remoa/contracts';
import {Alert,Button,Dialog,Select,Tag,Textarea} from '@remoa/ui';
import {t} from '@remoa/strings';
import {listSources} from './api';
import {prepareContentHashes} from './operations-api';
import {adminQuestionError,tq} from './labels';
import {QuestionsApiError} from '@/features/questions/request';

/** D-1804. Mounted per selection. One idempotencyKey per submission: it changes only when the payload does (reason/source). */
export function HashPrepareDialog({items,onClose,onDone}:{items:QuestionAdminCatalogItem[];onClose:()=>void;onDone:()=>void}){
 const[key,setKey]=useState(()=>crypto.randomUUID());const[reason,setReason]=useState('');const[sourceId,setSourceId]=useState('none');const[sources,setSources]=useState<QuestionSource[]>([]);
 const[busy,setBusy]=useState(false);const[error,setError]=useState<string|null>(null);const[failed,setFailed]=useState(false);const[result,setResult]=useState<QuestionHashPrepareResult|null>(null);
 useEffect(()=>{let live=true;void listSources().then(v=>{if(live)setSources(v.items);}).catch(()=>undefined);return()=>{live=false;};},[]);
 const edit=(apply:()=>void)=>{apply();setKey(crypto.randomUUID());setFailed(false);setError(null);};
 const submit=async()=>{if(busy||reason.trim().length<8)return;setBusy(true);setError(null);
  try{setResult(await prepareContentHashes({items:items.map(i=>({id:i.id,revision:i.version,expectedUpdatedAt:i.updatedAt})),sourceId:sourceId==='none'?null:sourceId,idempotencyKey:key,reason:reason.trim()}));}
  catch(e){setFailed(true);setError(e instanceof QuestionsApiError&&e.code==='internal'?tq('questionsAdmin.hashNetwork'):adminQuestionError(e));}
  finally{setBusy(false);}};
 const finish=()=>{if(result)onDone();onClose();};
 const byId=new Map(items.map(i=>[i.id,i]));
 return <Dialog open onOpenChange={open=>{if(!open&&!busy)finish();}} closeLabel={t('common.close')} title={tq('questionsAdmin.hashTitle')} description={tq('questionsAdmin.hashDescription',{n:items.length})}>
  {result?<div className="flex flex-col gap-4">
   {result.replayed?<p role="status" className="text-sm text-muted">{tq('questionsAdmin.hashReplayed')}</p>:null}
   <h3 className="font-semibold">{tq('questionsAdmin.hashResultTitle')}</h3>
   <ul className="flex max-h-80 flex-col gap-3 overflow-auto">{result.results.map(r=><li key={r.id} className="flex flex-col gap-1 border-t border-border pt-3"><Tag tone={r.outcome==='prepared'||r.outcome==='already_prepared'?'steady':'review'}>{tq(`questionsAdmin.hashOutcomes.${r.outcome}`)}</Tag><span className="break-words text-sm text-muted">{byId.get(r.id)?.stemPreview??r.id}</span></li>)}</ul>
   <Button onClick={finish}>{tq('questionsAdmin.hashDone')}</Button>
  </div>:<div className="flex flex-col gap-5">
   <Alert tone="watch" title={tq('questionsAdmin.hashNotApproval')}/>
   <Select label={tq('questionsAdmin.hashSource')} value={sourceId} onValueChange={v=>edit(()=>setSourceId(v))} options={[{value:'none',label:tq('questionsAdmin.hashNoSource')},...sources.map(s=>({value:s.id,label:s.name}))]}/>
   <p className="text-xs text-muted">{tq('questionsAdmin.hashSourceHelp')}</p>
   <Textarea label={tq('questionsAdmin.reason')} minLength={8} maxLength={500} value={reason} onChange={e=>edit(()=>setReason(e.target.value))}/>
   <p className="text-xs text-muted">{tq('questionsAdmin.reasonHelp')}</p>
   {error?<Alert role="alert" tone="review" title={error}>{failed?<p className="text-sm">{tq('questionsAdmin.hashRetryHelp')}</p>:null}</Alert>:null}
   <Button loading={busy} disabled={reason.trim().length<8} onClick={()=>void submit()}>{failed?tq('questionsAdmin.hashRetry'):tq('questionsAdmin.hashConfirm',{n:items.length})}</Button>
  </div>}
 </Dialog>;
}
