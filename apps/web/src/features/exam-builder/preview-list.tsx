'use client';
import {useState} from 'react';
import {Button,Tag} from '@remoa/ui';
import type {ExamPreviewItem} from '@remoa/contracts';
import {t} from './labels';

const VISIBLE=7;
export function PreviewList({items,pinned,areaName,busyId,onSwap,onRemove,onPin}:{items:readonly ExamPreviewItem[];pinned:ReadonlySet<string>;areaName:(id:string|null)=>string;busyId:string|null;onSwap:(id:string)=>void;onRemove:(id:string)=>void;onPin:(id:string)=>void}){
  const [all,setAll]=useState(false);
  const shown=all?items:items.slice(0,VISIBLE);
  return <div className="flex flex-col gap-3">
    <ol aria-label={t('examBuilder.preview')} className="m-0 flex list-none flex-col gap-3 p-0">
      {shown.map((q,i)=>{const n=i+1;const isPinned=pinned.has(q.questionId);return <li key={q.questionId} className="rounded-card border border-border bg-surface p-4">
        <div className="flex flex-wrap items-center gap-2"><span className="text-sm font-bold text-muted">{t('examBuilder.previewItem',{n})}</span>
          <Tag>{areaName(q.areaId)}</Tag><Tag tone="unknown">{t(`examBuilder.origins.${q.origin}`)}</Tag>
          {q.validation?<Tag tone="steady">{t(`examBuilder.seals.${q.validation.kind}`)}</Tag>:null}</div>
        <p className="my-2 break-words text-[15px]">{q.stemPreview}</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" aria-label={t('examBuilder.swapLabel',{n})} loading={busyId===q.questionId} onClick={()=>onSwap(q.questionId)}>{t('examBuilder.swap')}</Button>
          <Button variant="secondary" size="sm" aria-label={t('examBuilder.removeLabel',{n})} onClick={()=>onRemove(q.questionId)}>{t('examBuilder.remove')}</Button>
          <Button variant={isPinned?'primary':'secondary'} size="sm" aria-pressed={isPinned} aria-label={t(isPinned?'examBuilder.unpinLabel':'examBuilder.pinLabel',{n})} onClick={()=>onPin(q.questionId)}>{t(isPinned?'examBuilder.unpin':'examBuilder.pin')}</Button>
        </div></li>;})}
    </ol>
    {items.length>VISIBLE?<div className="flex flex-wrap items-center gap-3">
      {all?null:<p className="m-0 text-muted">{t('examBuilder.previewMore',{n:items.length-VISIBLE})}</p>}
      <Button variant="quiet" size="sm" aria-expanded={all} onClick={()=>setAll(v=>!v)}>{t(all?'examBuilder.showLess':'examBuilder.showAll')}</Button></div>:null}
  </div>;
}
