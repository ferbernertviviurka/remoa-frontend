'use client';
import {useState} from 'react';
import type {QuestionOutboxRecoverResult} from '@remoa/contracts';
import {Alert,Button,Dialog,Select,Tag,Textarea} from '@remoa/ui';
import {t} from '@remoa/strings';
import {recoverGenerationOutbox} from './operations-api';
import type {QuestionAdminOutboxItem} from './operations-types';
import {adminQuestionError,tq} from './labels';
import {QuestionsApiError} from '@/features/questions/request';

/** D-1805. Mounted per selection; the idempotencyKey changes only when the payload (reason, extra attempts) does. */
export function OutboxRecoverDialog({items,onClose,onDone}:{items:QuestionAdminOutboxItem[];onClose:()=>void;onDone:()=>void}){
 const[key,setKey]=useState(()=>crypto.randomUUID());const[reason,setReason]=useState('');const[extra,setExtra]=useState('1');
 const[busy,setBusy]=useState(false);const[error,setError]=useState<string|null>(null);const[failed,setFailed]=useState(false);const[result,setResult]=useState<QuestionOutboxRecoverResult|null>(null);
 const edit=(apply:()=>void)=>{apply();setKey(crypto.randomUUID());setFailed(false);setError(null);};
 const submit=async()=>{if(busy||reason.trim().length<8)return;setBusy(true);setError(null);
  try{setResult(await recoverGenerationOutbox({items:items.map(i=>({outboxId:i.outboxId,expectedAttempts:i.attempts,expectedAttemptLimit:i.attemptLimit})),extraAttempts:Number(extra),idempotencyKey:key,reason:reason.trim()}));}
  catch(e){setFailed(true);setError(e instanceof QuestionsApiError&&e.code==='internal'?tq('questionsAdmin.opsRecoverNetwork'):adminQuestionError(e));}
  finally{setBusy(false);}};
 const finish=()=>{if(result)onDone();onClose();};
 return <Dialog open onOpenChange={open=>{if(!open&&!busy)finish();}} closeLabel={t('common.close')} title={tq('questionsAdmin.opsRecoverTitle')} description={tq('questionsAdmin.opsRecoverDescription',{n:items.length})}>
  {result?<div className="flex flex-col gap-4">
   {result.replayed?<p role="status" className="text-sm text-muted">{tq('questionsAdmin.opsRecoverReplayed')}</p>:null}
   <ul className="flex max-h-80 flex-col gap-3 overflow-auto">{result.results.map(r=><li key={r.outboxId} className="flex flex-col gap-1 border-t border-border pt-3"><Tag tone={r.outcome==='granted'?'steady':'review'}>{tq(`questionsAdmin.opsRecoverOutcomes.${r.outcome}`,{n:r.granted,limit:r.attemptLimit??''})}</Tag><span className="break-all text-sm text-muted">{r.outboxId}</span></li>)}</ul>
   <Button onClick={finish}>{tq('questionsAdmin.hashDone')}</Button>
  </div>:<div className="flex flex-col gap-5">
   <Select label={tq('questionsAdmin.opsExtra')} value={extra} onValueChange={v=>edit(()=>setExtra(v))} options={[1,2,3,4,5].map(n=>({value:String(n),label:tq('questionsAdmin.opsExtraOption',{n})}))}/>
   <Textarea label={tq('questionsAdmin.reason')} minLength={8} maxLength={500} value={reason} onChange={e=>edit(()=>setReason(e.target.value))}/>
   <p className="text-xs text-muted">{tq('questionsAdmin.reasonHelp')}</p>
   {error?<Alert role="alert" tone="review" title={error}/>:null}
   <Button loading={busy} disabled={reason.trim().length<8} onClick={()=>void submit()}>{failed?tq('questionsAdmin.opsRecoverRetry'):tq('questionsAdmin.opsRecoverConfirm')}</Button>
  </div>}
 </Dialog>;
}
