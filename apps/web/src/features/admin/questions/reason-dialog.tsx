'use client';
import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import {t} from '@remoa/strings';
import {Alert,Button,Dialog,Textarea} from '@remoa/ui';
import {tq,adminQuestionError} from './labels';
export function ReasonDialog({title,description,open,onOpenChange,onConfirm,confirmLabel}:{title:string;description?:string;open:boolean;onOpenChange:(open:boolean)=>void;onConfirm:(reason:string)=>Promise<void>;confirmLabel:string}){
 const[reason,setReason]=useState('');const[busy,setBusy]=useState(false);const[error,setError]=useState<string|null>(null);
 const opener=useRef<HTMLElement|null>(null);const scope=useRef<HTMLElement|null>(null);const isOpen=useRef(false);const generation=useRef(0);const frame=useRef<number|null>(null);
 useLayoutEffect(()=>{
  if(open&&!isOpen.current){opener.current=document.activeElement instanceof HTMLElement?document.activeElement:null;scope.current=opener.current?.closest<HTMLElement>('section,article')??opener.current?.parentElement??null;generation.current++;}
  isOpen.current=open;
 },[open]);
 useEffect(()=>()=>{if(frame.current!==null)cancelAnimationFrame(frame.current);},[]);
 const close=()=>{
  const current=generation.current;const target=opener.current;const container=scope.current;
  setReason('');setError(null);onOpenChange(false);
  if(frame.current!==null)cancelAnimationFrame(frame.current);
  // Wait for the controlled portal to close before restoring its keyboard origin.
  frame.current=requestAnimationFrame(()=>{
   frame.current=null;if(isOpen.current||generation.current!==current)return;
   if(target?.isConnected&&!target.matches(':disabled,[aria-disabled="true"]')){target.focus();return;}
   if(!container?.isConnected)return;
   const alternative=container.querySelector<HTMLElement>('button:not(:disabled):not([aria-disabled="true"]),a[href]');
   if(alternative){alternative.focus();return;}
   const heading=container.querySelector<HTMLElement>('h1,h2,h3');if(heading){heading.tabIndex=-1;heading.focus();}
  });
 };
 const submit=async()=>{if(busy||reason.trim().length<8)return;setBusy(true);setError(null);try{await onConfirm(reason.trim());close();}catch(error){setError(adminQuestionError(error));}finally{setBusy(false);}};
 return <Dialog open={open} onOpenChange={value=>{if(!busy){if(value)onOpenChange(true);else close();}}} title={title} description={description} closeLabel={t('common.close')}><div className="flex flex-col gap-5"><Textarea label={tq('questionsAdmin.reason')} minLength={8} maxLength={500} value={reason} onChange={event=>setReason(event.target.value)}/><p className="text-xs text-muted">{tq('questionsAdmin.reasonHelp')}</p>{error?<Alert role="alert" tone="review" title={error}/>:null}<Button disabled={reason.trim().length<8} loading={busy} onClick={()=>void submit()}>{confirmLabel}</Button></div></Dialog>;
}
