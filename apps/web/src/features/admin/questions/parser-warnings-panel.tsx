'use client';
import {useEffect,useRef,useState} from 'react';
import type {QuestionParserWarningsData} from '@remoa/contracts';
import {Alert,Button} from '@remoa/ui';
import {panel} from '@/features/questions/shared';
import {getImportParserWarnings} from './api';
import {adminQuestionError,tq} from './labels';
type RequestSnapshot={importId:string;revision:number;generation:number};
export function ParserWarningsPanel({importId,revision,onRecover}:{importId:string;revision:number;onRecover?:(opener:HTMLButtonElement)=>void}){
 const[requested,setRequested]=useState<RequestSnapshot>({importId,revision,generation:0});
 const[data,setData]=useState<QuestionParserWarningsData|null>(null),[error,setError]=useState<string|null>(null),[loading,setLoading]=useState(false);
 const sequence=useRef(0);const stale=requested.importId!==importId||requested.revision!==revision;
 useEffect(()=>{const current=++sequence.current;const controller=new AbortController();if(stale){setLoading(false);return()=>controller.abort();}setLoading(true);setError(null);setData(null);
  const load=async()=>{try{const result=await getImportParserWarnings(importId,controller.signal);if(!controller.signal.aborted&&current===sequence.current)setData(result);}catch(e){if(!controller.signal.aborted&&current===sequence.current)setError(adminQuestionError(e));}finally{if(!controller.signal.aborted&&current===sequence.current)setLoading(false);}};void load();return()=>controller.abort();
 },[importId,revision,requested.generation,stale]);
 const refresh=()=>setRequested(old=>({importId,revision,generation:old.generation+1}));
 const visible=!stale?data:null;
 return <section aria-label={tq('questionsAdmin.parserWarningsTitle')} className={`${panel} min-w-0 space-y-4`}><h2 className="font-display text-2xl font-bold">{tq('questionsAdmin.parserWarningsTitle')}</h2><p className="text-sm text-muted">{tq('questionsAdmin.parserWarningsSnapshot')}</p>
 {stale?<p role="status">{tq('questionsAdmin.parserWarningsStale')}</p>:loading?<p role="status">{tq('questionsAdmin.parserWarningsLoading')}</p>:error?<Alert role="alert" tone="review" title={error}/>:null}
 {visible?<><p className="break-words text-sm">{tq('questionsAdmin.parserWarningsAttempt',{attempt:visible.attempt,version:visible.parserVersion})}</p>{visible.availability==='not_available'?<p role="status">{tq(visible.reason==='pending'?'questionsAdmin.parserWarningsPending':'questionsAdmin.parserWarningsNotRecorded')}</p>:<>
 {!visible.complete?<Alert role="status" tone="review" title={tq('questionsAdmin.parserWarningsIncomplete')}/>:<p>{tq('questionsAdmin.parserWarningsTotals',{total:visible.total!,candidates:visible.detectedCandidates!,contexts:visible.detectedContexts!})}</p>}
 {visible.errorCode?<p>{tq(`questionsAdmin.parserDiagnosticErrors.${visible.errorCode}`)}</p>:null}
 <p>{tq('questionsAdmin.parserWarningsCounts',{known:visible.knownCount!,unknown:visible.unknownCount!})}</p>{visible.truncated?<p role="status">{tq('questionsAdmin.parserWarningsTruncated',{count:visible.omittedKnownCount!})}</p>:null}
 {visible.items.length?<ul className="space-y-3">{visible.items.map((item,index)=><li className="rounded-map border border-border p-3" key={`${item.source}:${item.code}:${item.number??''}:${item.page??''}:${index}`}><p>{tq(`questionsAdmin.parserWarningLabels.${item.code}`,{number:item.number??'',page:item.page??''})}</p><p className="text-sm text-muted">{tq(item.source==='exam'?'questionsAdmin.proof':'questionsAdmin.key')} · {tq('questionsAdmin.parserWarningCount',{count:item.count})}</p></li>)}</ul>:<p>{tq(visible.complete&&visible.unknownCount===0&&visible.knownCount===0?'questionsAdmin.parserWarningsNoRecorded':'questionsAdmin.parserWarningsNoKnown')}</p>}
 </>}</>:null}
 <div className="flex flex-wrap gap-3"><Button variant="secondary" disabled={loading} onClick={refresh}>{tq('questionsAdmin.parserWarningsRefresh')}</Button>{visible?.availability==='available'&&visible.items.some(item=>['missing_question','expected_question_unmatched','no_questions_detected'].includes(item.code))&&onRecover?<Button variant="secondary" onClick={event=>onRecover(event.currentTarget)}>{tq('questionsAdmin.parserWarningsRecover')}</Button>:null}</div></section>;
}
