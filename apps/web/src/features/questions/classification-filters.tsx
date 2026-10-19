'use client';
import {useEffect,useState} from 'react';
import {Alert,Button,Checkbox,Combobox} from '@remoa/ui';
import {EXAM_BUILDER_LIMITS,type HealthCourseCode,type QuestionClassificationCatalog} from '@remoa/contracts';
import {listClassification} from './classification-api';
import {t} from './labels';

export type ClassificationSelection={areaIds:string[];topicIds:string[];classificationStatus?:'unclassified'};
export function ClassificationFilters({course,value,onChange,onCatalog}:{course:HealthCourseCode|null;value:ClassificationSelection;onChange:(value:ClassificationSelection)=>void;onCatalog?:(catalog:QuestionClassificationCatalog)=>void}){
 const [result,setResult]=useState<{course:HealthCourseCode;data:QuestionClassificationCatalog}|null>(null);
 const [status,setStatus]=useState<'loading'|'ready'|'error'>('loading');const [retry,setRetry]=useState(0);
 useEffect(()=>{if(!course)return;const controller=new AbortController();setStatus('loading');setResult(null);
  void listClassification(course,controller.signal).then(data=>{if(!controller.signal.aborted){setResult({course,data});setStatus('ready');onCatalog?.(data);}}).catch(()=>{if(!controller.signal.aborted)setStatus('error');});
  return()=>controller.abort();
 },[course,retry,onCatalog]);
 if(!course)return <p className="text-sm text-muted">{t('questions.classification.selectCourse')}</p>;
 const data=result?.course===course?result.data:null;
 if(status==='error')return <Alert role="alert" tone="review" title={t('questions.classification.error')}><Button variant="secondary" onClick={()=>setRetry(n=>n+1)}>{t('questions.classification.retry')}</Button></Alert>;
 if(!data||status==='loading')return <p role="status" className="text-sm text-muted">{t('questions.classification.loading')}</p>;
 const option=(area:QuestionClassificationCatalog['areas'][number],name:string,n:number)=>t(area.classificationKind==='automatic_unreviewed'?'questions.classification.automaticOption':'questions.classification.reviewedOption',{name,n});
 const selectedAreas=data.areas.filter(area=>value.areaIds.includes(area.id));
 const topics=selectedAreas.flatMap(area=>area.topics.map(topic=>({value:topic.id,label:option(area,topic.name,topic.count)})));
 const unclassified=value.classificationStatus==='unclassified';
 return <div className="flex min-w-0 flex-col gap-4">
  <p className="text-sm text-muted">{t('questions.classification.help')}</p>
  <Checkbox checked={unclassified} onCheckedChange={on=>onChange({areaIds:[],topicIds:[],classificationStatus:on===true?'unclassified':undefined})} label={t('questions.classification.unclassified')}/>
  <p className="text-xs text-muted">{t('questions.classification.unclassifiedHelp')} {t('questions.classification.pendingCounts',{area:data.unclassifiedArea,topic:data.unclassifiedTopic})}</p>
  {!unclassified?<>
   <Combobox max={EXAM_BUILDER_LIMITS.maxAreas} label={t('questions.classification.areas')} placeholder={t('questions.classification.allAreas')} options={data.areas.map(area=>({value:area.id,label:option(area,area.name,area.count)}))} value={value.areaIds} onValueChange={areaIds=>{const valid=new Set(data.areas.filter(area=>areaIds.includes(area.id)).flatMap(area=>area.topics.map(topic=>topic.id)));onChange({areaIds,topicIds:value.topicIds.filter(id=>valid.has(id)),classificationStatus:undefined});}}/>
   <Combobox max={EXAM_BUILDER_LIMITS.maxTopics} label={t('questions.classification.topics')} placeholder={t('questions.classification.allTopics')} options={topics} value={value.topicIds} disabledMessage={selectedAreas.length?undefined:t('questions.classification.topicParent')} onValueChange={topicIds=>onChange({...value,topicIds,classificationStatus:undefined})}/>
  </>:null}
  {!data.areas.length?<p className="text-sm text-muted">{t('questions.classification.empty')}</p>:null}
  <p className="text-xs text-muted">{t('questions.classification.sourceScope')}</p><div><Button size="sm" variant="quiet" onClick={()=>setRetry(n=>n+1)}>{t('questions.classification.refresh')}</Button></div>
 </div>;
}
