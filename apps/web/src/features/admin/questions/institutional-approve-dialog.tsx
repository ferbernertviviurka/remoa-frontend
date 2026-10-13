'use client';
import {useRef,useState} from 'react';
import type {QuestionAdminCatalogItem,QuestionInstitutionalApproveResult} from '@remoa/contracts';
import {Alert,Button,Checkbox,Dialog,Input,Tag,Textarea} from '@remoa/ui';
import {t} from '@remoa/strings';
import {approveInstitutionally} from './operations-api';
import {batchCount,runBatches} from './batches';
import {adminQuestionError,tq} from './labels';
import {QuestionsApiError} from '@/features/questions/request';

/** D-1819, D-1840. Mounted per selection, any size: sent 500 per call, one after another; a failure resumes from that batch with its key. Items without hash are not sent (hash_missing). */
export function InstitutionalApproveDialog({items,onClose,onDone}:{items:QuestionAdminCatalogItem[];onClose:()=>void;onDone:()=>void}){
 const sendable=items.filter(i=>i.contentHash);const noHash=items.length-sendable.length;
 const keys=useRef<string[]>([]);const[name,setName]=useState('');const[reason,setReason]=useState('');const[accepted,setAccepted]=useState(false);
 const[busy,setBusy]=useState(false);const[error,setError]=useState<string|null>(null);const[failed,setFailed]=useState(false);const[results,setResults]=useState<QuestionInstitutionalApproveResult['results']>([]);const[done,setDone]=useState(0);const total=batchCount(sendable.length);const finished=total>0&&done>=total;
 const edit=(apply:()=>void)=>{apply();keys.current=keys.current.slice(0,done);setFailed(false);setError(null);};
 const nameOk=name.trim().length>=3&&!/\d/.test(name);const valid=nameOk&&accepted&&reason.trim().length>=8&&sendable.length>0;
 const submit=async()=>{if(busy||!valid)return;setBusy(true);setError(null);
  try{await runBatches(sendable,keys.current,done,(chunk,key)=>approveInstitutionally({items:chunk.map(i=>({id:i.id,revision:i.version,expectedContentHash:i.contentHash as string})),attestation:{approverRole:'medical_founder',approverName:name.trim(),rightsBasis:'remoa_owned',acceptsUnconfirmedChecks:true},idempotencyKey:key,reason:reason.trim()}),(d,r)=>{setDone(d);setResults(old=>[...old,...r]);});}
  catch(e){setFailed(true);setError(e instanceof QuestionsApiError&&e.code==='internal'?tq('questionsAdmin.instNetwork'):adminQuestionError(e));}
  finally{setBusy(false);}};
 const finish=()=>{if(done)onDone();onClose();};
 const byId=new Map(items.map(i=>[i.id,i]));
 const count=(...o:string[])=>results.filter(r=>o.includes(r.outcome)).length;
 const failedCount=results.length-count('published','already_published');const pending=results.filter(r=>r.outcome!=='published'&&r.outcome!=='already_published');
 return <Dialog open onOpenChange={open=>{if(!open&&!busy)finish();}} closeLabel={t('common.close')} title={tq('questionsAdmin.instTitle')} description={tq('questionsAdmin.instDescription',{n:sendable.length})}>
  {finished?<div className="flex flex-col gap-4">
   <h3 className="font-semibold">{tq('questionsAdmin.instResultTitle')}</h3>
   <p role="status" className="text-sm">{tq('questionsAdmin.instSummary',{published:count('published'),already:count('already_published'),failed:failedCount})}</p>
   {count('hash_missing')?<Alert tone="watch" title={tq('questionsAdmin.instHashHint')}/>:null}
   <ul className="flex max-h-80 flex-col gap-3 overflow-auto">{pending.slice(0,100).map(r=><li key={r.id} className="flex flex-col gap-1 border-t border-border pt-3"><Tag tone="review">{tq(`questionsAdmin.instOutcomes.${r.outcome}`)}</Tag><span className="break-words text-sm text-muted">{byId.get(r.id)?.stemPreview??r.id}</span></li>)}</ul>
   <Button onClick={finish}>{tq('questionsAdmin.instDone')}</Button>
  </div>:<div className="flex flex-col gap-5">
   {noHash?<Alert tone="watch" title={tq('questionsAdmin.instNoHash',{n:noHash})}/>:null}
   <Input label={tq('questionsAdmin.instApprover')} value={name} maxLength={200} aria-invalid={name.length>0&&!nameOk} onChange={e=>edit(()=>setName(e.target.value))}/>
   <p className="text-xs text-muted">{name.length>0&&!nameOk?tq('questionsAdmin.instApproverInvalid'):tq('questionsAdmin.instApproverHelp')}</p>
   <dl className="grid gap-1 text-sm"><div className="flex gap-2"><dt className="text-muted">{tq('questionsAdmin.instRole')}:</dt><dd>{tq('questionsAdmin.instRoleValue')}</dd></div><div className="flex gap-2"><dt className="text-muted">{tq('questionsAdmin.instRights')}:</dt><dd>{tq('questionsAdmin.instRightsValue')}</dd></div></dl>
   <Textarea label={tq('questionsAdmin.reason')} minLength={8} maxLength={500} value={reason} onChange={e=>edit(()=>setReason(e.target.value))}/>
   <p className="text-xs text-muted">{tq('questionsAdmin.reasonHelp')}</p>
   <Checkbox checked={accepted} onCheckedChange={v=>edit(()=>setAccepted(v===true))} label={tq('questionsAdmin.instAccept')}/>
   {total>1?<p role="status" className="text-sm">{tq('questionsAdmin.batchProgress',{done,total})}</p>:null}
   {error?<Alert role="alert" tone="review" title={error}>{failed?<p className="text-sm">{tq('questionsAdmin.instRetryHelp')}</p>:null}</Alert>:null}
   <Button loading={busy} disabled={!valid} onClick={()=>void submit()}>{failed?tq('questionsAdmin.instRetry'):tq('questionsAdmin.instConfirm',{n:sendable.length})}</Button>
  </div>}
 </Dialog>;
}
