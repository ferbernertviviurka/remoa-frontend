'use client';
import {useEffect,useState} from 'react';
import type {QuestionSessionPublic,QuestionSessionReport} from '@remoa/contracts';
import {Alert,Button} from '@remoa/ui';
import {listQuestionTaxonomy} from './api';
import {t} from './labels';
import {panel} from './shared';
type Taxonomy=Awaited<ReturnType<typeof listQuestionTaxonomy>>;
export function SubjectResults({session,report}:{session:QuestionSessionPublic;report:QuestionSessionReport}){
 const[names,setNames]=useState<{areas:Taxonomy;topics:Taxonomy}|null>(null);
 const[error,setError]=useState(false);const[loading,setLoading]=useState(true);const[retry,setRetry]=useState(0);
 useEffect(()=>{
  let current=true;setNames(null);setError(false);setLoading(true);
  const load=async()=>{try{const[areas,topics]=await Promise.all([listQuestionTaxonomy('area'),listQuestionTaxonomy('topic')]);if(current)setNames({areas,topics});}catch{if(current)setError(true);}finally{if(current)setLoading(false);}};
  void load();return()=>{current=false;};
 },[session.id,retry]);
 const items=new Map(session.items.map(item=>[item.id,item]));
 const groups=new Map<string,{topicId:string|null;areaId:string|null;correct:number;incorrect:number;unanswered:number;annulled:number}>();
 for(const result of report.items){
  const question=items.get(result.itemId)?.question;const topicId=question?.topicId??null;const areaId=question?.areaId??null;const key=`${areaId??''}:${topicId??''}`;
  let group=groups.get(key);if(!group){group={topicId,areaId,correct:0,incorrect:0,unanswered:0,annulled:0};groups.set(key,group);}group[result.result]++;
 }
 return <section aria-labelledby="subject-results-heading" className={`${panel} min-w-0 space-y-4`}>
  <h2 id="subject-results-heading" className="font-display text-2xl font-bold">{t('questions.subjectResultsTitle')}</h2><p className="text-muted">{t('questions.subjectResultsDescription')}</p>
  {loading?<p role="status">{t('questions.subjectLoading')}</p>:null}
  {error?<Alert tone="watch" role="alert" title={t('questions.subjectNamesError')}><Button variant="secondary" onClick={()=>setRetry(value=>value+1)}>{t('common.retry')}</Button></Alert>:null}
  <ul className="space-y-4">{[...groups].map(([key,group])=>{
   const denominator=group.correct+group.incorrect+group.unanswered;
   const topic=group.topicId?names?.topics.find(topic=>topic.id===group.topicId)?.name:null;
   const area=group.areaId?names?.areas.find(area=>area.id===group.areaId)?.name:null;
   return <li key={key} className="min-w-0 space-y-2 rounded-field border border-border p-4">
    <h3 className="break-words font-bold">{topic??t(group.topicId?'questions.subjectUnknown':'questions.subjectUnclassified')}</h3>
    <p className="break-words text-sm text-muted">{area??t(group.areaId?'questions.subjectAreaUnknown':'questions.subjectAreaUnclassified')}</p>
    <p>{denominator===0?t('questions.subjectNoDenominator'):t(denominator===1?'questions.subjectScoreOne':'questions.subjectScore',{correct:group.correct,denominator})}</p>
    <div className="flex flex-wrap gap-3 text-sm"><p>{group.incorrect===1?t('questions.resultWrongOne'):t('questions.resultWrong',{n:group.incorrect})}</p><p>{group.unanswered===1?t('questions.resultUnansweredOne'):t('questions.resultUnanswered',{n:group.unanswered})}</p><p>{group.annulled===1?t('questions.resultAnnulledOne'):t('questions.resultAnnulled',{n:group.annulled})}</p></div>
   </li>;
  })}</ul>
 </section>;
}
