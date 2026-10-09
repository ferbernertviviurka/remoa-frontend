'use client';
import { useState } from 'react';
import { t } from '@remoa/strings';
import { Alert, Button, Dialog, Select, Textarea } from '@remoa/ui';
import { tq, adminQuestionError } from './labels';

/** Local editor interaction; the API accepts page/revision/reason separately. */
export function PageImageDialog({pages,open,onOpenChange,onConfirm}:{pages:number[];open:boolean;onOpenChange:(open:boolean)=>void;onConfirm:(page:number,alt:string,reason:string)=>Promise<void>}) {
  const [page,setPage]=useState(pages[0]??0);
  const [alt,setAlt]=useState('');
  const [reason,setReason]=useState('');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState<string|null>(null);
  const valid=pages.includes(page)&&alt.trim().length>0&&reason.trim().length>=8;
  const submit=async()=>{
    if(!valid||busy)return;
    setBusy(true);setError(null);
    try {await onConfirm(page,alt.trim(),reason.trim());onOpenChange(false);}
    catch(e){setError(adminQuestionError(e));}
    finally {setBusy(false);}
  };
  return <Dialog open={open} onOpenChange={value=>{if(!busy)onOpenChange(value);}} title={tq('questionsAdmin.addPageImage')} description={tq('questionsAdmin.pageImageDescription')} closeLabel={t('common.close')}>
    <fieldset disabled={busy} className="space-y-5">
      <Select label={tq('questionsAdmin.pageImagePage')} value={String(page)} onValueChange={value=>setPage(Number(value))} options={pages.map(value=>({value:String(value),label:tq('questionsAdmin.pageNumber',{n:value})}))}/>
      <Textarea label={tq('questionsAdmin.pageImageAlt')} value={alt} maxLength={1000} onChange={event=>setAlt(event.target.value)}/>
      <Textarea label={tq('questionsAdmin.reason')} value={reason} minLength={8} maxLength={500} onChange={event=>setReason(event.target.value)}/>
      <p className="text-sm text-muted">{tq('questionsAdmin.pageImageReview')}</p>
      {error?<Alert role="alert" tone="review" title={error}/>:null}
      <Button loading={busy} disabled={!valid} onClick={()=>void submit()}>{tq('questionsAdmin.attachPageImage')}</Button>
    </fieldset>
  </Dialog>;
}
