'use client';
import {useState} from 'react';
import {Alert,Button,Dialog,Input} from '@remoa/ui';
import {t} from './labels';

export type Changed={unavailable:string[];updated:{id:string;latestId:string}[]}|null;

export function ConfirmDialog({open,onOpenChange,count,minutes,mode,hasAi,busy,error,onStart}:{open:boolean;onOpenChange:(v:boolean)=>void;count:number;minutes:number|null;mode:'study'|'simulation';hasAi:boolean;busy:boolean;error:string|null;onStart:()=>void}){
  return <Dialog open={open} onOpenChange={v=>{if(!busy)onOpenChange(v);}} title={t('examBuilder.confirmTitle')} description={t('examBuilder.confirmDescription',{n:count,time:minutes?t('examBuilder.confirmTimeValue',{n:minutes}):t('examBuilder.confirmTimeNone')})} closeLabel={t('examBuilder.close')}>
    <div className="flex flex-col gap-4">
      <ul className="m-0 flex list-disc flex-col gap-2 pl-5 text-[15px]">
        <li>{t(mode==='study'?'examBuilder.confirmAnswerStudy':'examBuilder.confirmAnswerSimulation')}</li>
        <li>{t('examBuilder.confirmPause')}</li>
        {hasAi?<li>{t('examBuilder.confirmAi')}</li>:null}
      </ul>
      {error?<Alert tone="review" role="alert" title={error}/>:null}
      <div className="flex flex-wrap gap-3"><Button loading={busy} loadingLabel={t('examBuilder.starting')} onClick={onStart}>{t('examBuilder.start')}</Button>
        <Button variant="secondary" disabled={busy} onClick={()=>onOpenChange(false)}>{t('examBuilder.confirmCancel')}</Button></div>
    </div></Dialog>;
}

export function ChangedDialog({changed,checking,onClose,onAccept}:{changed:Changed;checking:boolean;onClose:()=>void;onAccept:()=>void}){
  const nothing=changed&&!changed.unavailable.length&&!changed.updated.length;
  return <Dialog open={checking||changed!==null} onOpenChange={v=>{if(!v&&!checking)onClose();}} title={t('examBuilder.changedTitle')} description={t('examBuilder.changedDescription')} closeLabel={t('examBuilder.close')}>
    {checking?<p role="status">{t('examBuilder.changedChecking')}</p>:<div className="flex flex-col gap-3">
      {changed?.unavailable.length?<p className="m-0">{t('examBuilder.changedUnavailable',{n:changed.unavailable.length})}</p>:null}
      {changed?.updated.length?<p className="m-0">{t('examBuilder.changedUpdated',{n:changed.updated.length})}</p>:null}
      {nothing?<p className="m-0">{t('examBuilder.changedNothing')}</p>:null}
      <div className="flex flex-wrap gap-3"><Button onClick={onAccept}>{t('examBuilder.changedAccept')}</Button><Button variant="secondary" onClick={onClose}>{t('examBuilder.confirmCancel')}</Button></div></div>}
  </Dialog>;
}

export function ActiveDialog({sessionId,onClose}:{sessionId:string|null;onClose:()=>void}){
  return <Dialog open={sessionId!==null} onOpenChange={v=>{if(!v)onClose();}} title={t('examBuilder.activeTitle')} description={t('examBuilder.activeDescription')} closeLabel={t('examBuilder.close')}>
    <a href={`/app/simulados/${sessionId??''}`} className="inline-flex min-h-12 items-center rounded-btn bg-primary px-6 font-bold text-on-primary">{t('examBuilder.activeResume')}</a>
  </Dialog>;
}

/** Name (template) or date (calendar): one tiny single-field dialog. */
export function FieldDialog({open,onOpenChange,title,description,label,type,initial,action,error,onSubmit}:{open:boolean;onOpenChange:(v:boolean)=>void;title:string;description:string;label:string;type:'text'|'date';initial:string;action:string;error:string|null;onSubmit:(value:string)=>Promise<void>}){
  const [value,setValue]=useState(initial);const [busy,setBusy]=useState(false);
  return <Dialog open={open} onOpenChange={onOpenChange} title={title} description={description} closeLabel={t('examBuilder.close')}>
    <form className="flex flex-col gap-4" onSubmit={e=>{e.preventDefault();setBusy(true);void onSubmit(value).finally(()=>setBusy(false));}}>
      <Input label={label} type={type} value={value} maxLength={type==='text'?80:undefined} required onChange={e=>setValue(e.target.value)}/>
      {error?<Alert tone="review" role="alert" title={error}/>:null}
      <Button type="submit" loading={busy} disabled={!value.trim()}>{action}</Button>
    </form></Dialog>;
}
