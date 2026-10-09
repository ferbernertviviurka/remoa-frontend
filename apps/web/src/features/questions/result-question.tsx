'use client';
import {useState} from 'react';
import type {QuestionSessionPublic,QuestionSessionReport} from '@remoa/contracts';
import {Alert,Tag} from '@remoa/ui';
import {t} from './labels';
import {MapLink,panel,QuestionMeta} from './shared';
type Item=QuestionSessionPublic['items'][number];
type Result=QuestionSessionReport['items'][number];
export function ResultQuestion({item,result}:{item:Item;result:Result}){
 const[failedImages,setFailedImages]=useState<Set<string>>(()=>new Set());
 const heading=`result-${item.id}`;
 return <article aria-labelledby={heading} className={`${panel} min-w-0 space-y-4`}>
  <div className="flex flex-wrap justify-between gap-3"><QuestionMeta question={item.question}/><Tag tone={result.result==='correct'?'steady':'review'}>{result.result!=='annulled'&&item.answered&&item.selectedKey===null?t('questions.didNotKnow'):t(`questions.result.${result.result}`)}</Tag></div>
  <h2 id={heading} className="font-display text-xl font-bold">{t('questions.resultReviewNumber',{n:item.position+1})}</h2>
  {item.originalNumber?<p className="text-sm text-muted">{t('questions.originalNumber',{n:item.originalNumber})}</p>:null}
  <p className="whitespace-pre-wrap break-words font-display text-xl font-bold">{item.question.stem}</p>
  {item.question.assets.map(asset=><figure className="min-w-0 space-y-2" key={asset.id}>
   {failedImages.has(`${asset.id}:${asset.url}`)?<Alert tone="watch" title={t('questions.resultImageError')}/>:<img key={asset.url} src={asset.url} alt={asset.alt} className="h-auto max-w-full rounded-map border border-border" onError={()=>setFailedImages(previous=>new Set(previous).add(`${asset.id}:${asset.url}`))}/>}
   <figcaption className="whitespace-pre-wrap break-words text-sm text-muted">{asset.alt}</figcaption>
  </figure>)}
  <p className="font-semibold">{!item.answered?t('questions.resultNoAnswer'):item.selectedKey===null?t('questions.resultDidNotKnow'):t('questions.resultStudentAnswer',{key:item.selectedKey})}</p>
  {item.question.alternatives?<ul className="min-w-0 space-y-3">{item.question.alternatives.map(alternative=>{
   const selected=item.answered&&item.selectedKey===alternative.key;
   const correct=!result.reference.annulled&&result.reference.correctKey===alternative.key;
   return <li key={alternative.key} className={`min-w-0 space-y-2 rounded-field border p-3 ${correct?'border-steady bg-steady-bg':selected?'border-primary bg-primary-tint':'border-border'}`}>
    <p className="whitespace-pre-wrap break-words"><strong>{alternative.key}. </strong>{alternative.text}</p>
    <div className="flex flex-wrap gap-2">{selected?<Tag>{t('questions.resultSelectedAlternative')}</Tag>:null}{correct?<Tag tone="steady">{t('questions.resultCorrectAlternative')}</Tag>:null}</div>
   </li>;
  })}</ul>:null}
  {result.reference.annulled?<p>{t('questions.annulledInfo')}</p>:<p className="font-bold">{t('questions.correctKey',{key:result.reference.correctKey??'—'})}</p>}
  <p className="whitespace-pre-wrap break-words text-muted">{result.reference.explanation??t('questions.noExplanation')}</p>
  {result.reference.distractorNotes&&Object.keys(result.reference.distractorNotes).length?<section className="space-y-3"><h3 className="font-bold">{t('questions.resultDistractors')}</h3>{Object.entries(result.reference.distractorNotes).map(([key,note])=><p className="whitespace-pre-wrap break-words" key={key}><strong>{key}. </strong>{note}</p>)}</section>:null}
  <p className="text-xs text-muted">{t(result.reference.reviewed?'questions.reviewed':'questions.unreviewed')}{result.reference.reviewerName?` · ${result.reference.reviewerName}`:''}{result.reference.reviewerCrm?` · ${result.reference.reviewerCrm}`:''}{result.reference.referenceDate?` · ${result.reference.referenceDate}`:''}</p>
  {result.reference.obsolete?<Alert title={t(item.question.availability==='active'?'questions.obsolete':'questions.unavailable')} tone="watch"/>:null}
  {result.reference.sourceUrl?<a className="inline-flex min-h-11 break-all items-center text-primary-deep" href={result.reference.sourceUrl} target="_blank" rel="noopener noreferrer">{t('questions.provenance')}</a>:null}
  <MapLink question={item.question}/>
 </article>;
}
