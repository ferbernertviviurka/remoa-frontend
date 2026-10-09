'use client';
import {useEffect,useRef,useState} from 'react';
import {t} from './labels';
import {Alert,Button} from '@remoa/ui';
import type {QuestionSessionPublic,QuestionSessionRecalculation} from '@remoa/contracts';
import {getSessionRecalculation} from './api';
import {panel} from './shared';
export function RecalculationPanel({sessionId,items=[]}:{sessionId:string;items?:QuestionSessionPublic['items']}){
 const[data,setData]=useState<QuestionSessionRecalculation|null>(null);const[busy,setBusy]=useState(false);const[error,setError]=useState(false);const sequence=useRef(0);
 useEffect(()=>{const guard=sequence;guard.current++;setData(null);setBusy(false);setError(false);return()=>{guard.current++;};},[sessionId]);
 const compare=async()=>{
  const request=++sequence.current;setBusy(true);setError(false);setData(null);
  try{const value=await getSessionRecalculation(sessionId);if(request!==sequence.current)return;if(value.sessionId!==sessionId)throw new Error('session_mismatch');setData(value);}
  catch{if(request===sequence.current)setError(true);}finally{if(request===sequence.current)setBusy(false);}
 };
 const snapshots=new Map(items.map(item=>[item.id,item]));
 return <section aria-labelledby="recalculation-heading" className={`${panel} min-w-0 space-y-4`}><h2 id="recalculation-heading" className="font-display text-2xl font-bold">{t('questions.recalculationTitle')}</h2><p className="text-muted">{t('questions.recalculationDescription')}</p><Button variant="secondary" loading={busy} loadingLabel={t('questions.recalculationLoading')} onClick={()=>void compare()}>{t('questions.recalculationAction')}</Button>{error?<Alert tone="review" role="alert" title={t('questions.recalculationError')}/>:null}
  {data?<><p className="text-sm text-muted">{t('questions.recalculationDate',{date:new Date(data.calculatedAt).toLocaleString('pt-BR')})}</p>{data.complete&&data.aggregates?<p className="font-display text-xl font-bold">{data.aggregates.denominator===0?t('questions.scoreNone'):t(data.aggregates.denominator===1?'questions.resultScoreOne':'questions.resultScore',{correct:data.aggregates.correct,denominator:data.aggregates.denominator})}</p>:<Alert tone="watch" title={t('questions.recalculationPartial')}/>}
   <ul className="space-y-4">{data.items.map(item=>{const snapshot=snapshots.get(item.itemId);return <li className="min-w-0 space-y-2 rounded-field border border-border p-4" key={item.itemId}>
    <h3 className="font-bold">{snapshot?t('questions.resultReviewNumber',{n:snapshot.position+1}):t('questions.recalculationItemUnknown')}</h3>
    {snapshot?.originalNumber?<p className="text-sm text-muted">{t('questions.originalNumber',{n:snapshot.originalNumber})}</p>:null}
    {snapshot?<p className="whitespace-pre-wrap break-words">{snapshot.question.stem}</p>:null}
    <p className="font-bold">{t(`questions.recalculationOutcomes.${item.outcome}`)}</p><p className="text-sm">{t(`questions.recalculationReasons.${item.reasonCode}`)}</p><p className="text-xs text-muted">{t('questions.recalculationVersions',{original:item.originalQuestionVersion,current:item.comparedQuestionVersion??t('questions.recalculationNoVersion')})}</p>
    {item.reference?<><p>{t('questions.correctKey',{key:item.reference.correctKey??'—'})}</p><p className="whitespace-pre-wrap break-words">{item.reference.explanation??t('questions.noExplanation')}</p><p className="text-xs text-muted">{t(item.reference.reviewed?'questions.reviewed':'questions.unreviewed')}{item.reference.reviewerName?` · ${item.reference.reviewerName}`:''}{item.reference.reviewerCrm?` · ${item.reference.reviewerCrm}`:''}{item.reference.referenceDate?` · ${item.reference.referenceDate}`:''}</p></>:null}
   </li>;})}</ul>
  </>:null}
 </section>;
}
