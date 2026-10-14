'use client';
import {useState} from 'react';
import type {QuestionCandidate,QuestionCandidateAcceptResult} from '@remoa/contracts';
import {Alert,Button,Checkbox,Dialog,Tag,Textarea} from '@remoa/ui';
import {t} from '@remoa/strings';
import {panel} from '@/features/questions/shared';
import {acceptCandidates} from './api';
import {adminQuestionError,tq} from './labels';

const MAX=200; // = QUESTION_CANDIDATE_ACCEPT_MAX; client code imports only types from @remoa/contracts (bundle)
/** D-1841: select pending candidates (or all) and accept them with one reason; per-item outcomes come back from the API. Never publishes. */
export function CandidateAcceptBatch({importId,importRevision,candidates,blocked,label,onDone}:{importId:string;importRevision:number;candidates:QuestionCandidate[];blocked:boolean;label:(candidate:QuestionCandidate)=>string;onDone:()=>void|Promise<void>}){
 const pending=candidates.filter(c=>c.state==='pending'||c.state==='needs_review').slice(0,MAX);
 const[selected,setSelected]=useState<Set<string>>(new Set());const[open,setOpen]=useState(false);
 const[reason,setReason]=useState('');const[confirmed,setConfirmed]=useState(false);const[busy,setBusy]=useState(false);const[error,setError]=useState<string|null>(null);const[result,setResult]=useState<QuestionCandidateAcceptResult|null>(null);
 const chosen=pending.filter(c=>selected.has(c.id));
 const toggle=(id:string,on:boolean)=>setSelected(old=>{const next=new Set(old);if(on)next.add(id);else next.delete(id);return next;});
 const submit=async()=>{if(busy||!confirmed||reason.trim().length<8||!chosen.length)return;setBusy(true);setError(null);
  try{setResult(await acceptCandidates(importId,{importRevision,items:chosen.map(c=>({id:c.id,revision:c.revision})),confirmsChecks:true,reason:reason.trim()}));}
  catch(e){setError(adminQuestionError(e));}finally{setBusy(false);}};
 const finish=()=>{const done=Boolean(result);setOpen(false);setResult(null);setReason('');setConfirmed(false);setError(null);if(done){setSelected(new Set());void onDone();}};
 const byId=new Map(candidates.map(c=>[c.id,c]));const accepted=result?.results.filter(r=>r.outcome==='accepted').length??0;
 return <section aria-labelledby="accept-batch-heading" className={`${panel} space-y-4`}>
  <h2 id="accept-batch-heading" className="font-display text-2xl font-bold">{tq('questionsAdmin.acceptTitle')}</h2>
  <p className="text-sm text-muted">{tq('questionsAdmin.acceptHelp')}</p>
  {pending.length?<>
   <div className="flex flex-wrap items-center gap-3"><Button variant="secondary" onClick={()=>setSelected(new Set(pending.map(c=>c.id)))}>{tq('questionsAdmin.acceptSelectAll',{n:pending.length})}</Button><Button variant="secondary" disabled={!chosen.length} onClick={()=>setSelected(new Set())}>{tq('questionsAdmin.acceptClear')}</Button><span role="status" className="text-sm">{tq('questionsAdmin.acceptSelected',{n:chosen.length})}</span><Button disabled={!chosen.length||blocked} onClick={()=>setOpen(true)}>{tq('questionsAdmin.acceptAction')}</Button></div>
   <ul className="max-h-80 overflow-auto">{pending.map(c=><li key={c.id}><Checkbox label={label(c)} aria-label={tq('questionsAdmin.acceptSelect',{label:label(c)})} checked={selected.has(c.id)} onCheckedChange={v=>toggle(c.id,v===true)}/></li>)}</ul>
  </>:<p>{tq('questionsAdmin.acceptEmpty')}</p>}
  {open?<Dialog open onOpenChange={value=>{if(!value&&!busy)finish();}} closeLabel={t('common.close')} title={tq('questionsAdmin.acceptTitle')} description={tq('questionsAdmin.acceptDescription',{n:chosen.length})}>
   {result?<div className="flex flex-col gap-4">
    <h3 className="font-semibold">{tq('questionsAdmin.acceptResultTitle')}</h3>
    <p role="status" className="text-sm">{tq('questionsAdmin.acceptSummary',{accepted,failed:result.results.length-accepted})}</p>
    <ul className="flex max-h-80 flex-col gap-3 overflow-auto">{result.results.map(r=>{const c=byId.get(r.id);return <li key={r.id} className="flex flex-col gap-1 border-t border-border pt-3"><Tag tone={r.outcome==='accepted'||r.outcome==='already_accepted'?'steady':'review'}>{tq(`questionsAdmin.acceptOutcomes.${r.outcome}`)}</Tag><span className="text-sm text-muted">{c?label(c):r.id}</span></li>;})}</ul>
    <Button onClick={finish}>{tq('questionsAdmin.acceptDone')}</Button>
   </div>:<div className="flex flex-col gap-5">
    <Textarea label={tq('questionsAdmin.reason')} minLength={8} maxLength={500} value={reason} onChange={e=>setReason(e.target.value)}/>
    <p className="text-xs text-muted">{tq('questionsAdmin.reasonHelp')}</p>
    <Checkbox checked={confirmed} onCheckedChange={v=>setConfirmed(v===true)} label={tq('questionsAdmin.acceptConfirmChecks')}/>
    {error?<Alert role="alert" tone="review" title={error}/>:null}
    <Button loading={busy} disabled={!confirmed||reason.trim().length<8} onClick={()=>void submit()}>{tq('questionsAdmin.acceptConfirm',{n:chosen.length})}</Button>
   </div>}
  </Dialog>:null}
 </section>;
}
