'use client';
import Link from 'next/link';
import {useRef,useState} from 'react';
import {useRouter} from 'next/navigation';
import type {QuestionSessionPublic,QuestionSessionReport} from '@remoa/contracts';
import {Alert,Button,Icon} from '@remoa/ui';
import {addSessionCardsToReview,createSession,questionError} from './api';
import {t} from './labels';
import {actionLink,PageTitle} from './shared';
import {RecalculationPanel} from './recalculation-panel';
import {ResultQuestion} from './result-question';
import {SubjectResults} from './subject-results';
export function SessionResult({session,report}:{session:QuestionSessionPublic;report:QuestionSessionReport}){
 const router=useRouter();const[busy,setBusy]=useState(false);const[error,setError]=useState<string|null>(null);const[reviewMessage,setReviewMessage]=useState<string|null>(null);const retryKey=useRef(crypto.randomUUID());
 const pct=report.denominator>0?Math.round(report.correct/report.denominator*100):null;const low=pct!==null&&report.correct/report.denominator<0.7;
 const items=new Map(session.items.map(item=>[item.id,item]));
 const wrong=report.items.filter(result=>result.result==='incorrect').flatMap(result=>{const item=items.get(result.itemId);return item?[item.question.id]:[];});
 const retry=async()=>{setBusy(true);setError(null);try{const next=await createSession({mode:'study',questionIds:wrong,count:wrong.length,timerSec:null,shuffle:false},retryKey.current);router.push(`/app/simulados/${next.id}`);}catch(e){setError(questionError(e));}finally{setBusy(false);}};
 const addReview=async()=>{setBusy(true);setError(null);try{const value=await addSessionCardsToReview(session.id);setReviewMessage(t('questions.reviewAdded',{n:value.cards}));}catch(e){setError(questionError(e));}finally{setBusy(false);}};
 // This surface is only available after the authoritative report has been unlocked.
 if(session.status==='active'||report.sessionId!==session.id)return null;
 return <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-6 py-2 md:px-6">
  <PageTitle title={t('questions.resultTitle')} description={t('questions.resultDescription')}><Link className={actionLink} href="/app/banco-de-questoes">{t('questions.newTrain')}</Link></PageTitle>
  <section aria-labelledby="session-score" className={`rounded-[30px] p-7 ${low?'border-[1.5px] border-danger bg-danger-bg text-danger-text':'bg-panel-dark text-white'}`}>{pct===null?null:<div className="mb-3 flex items-center gap-3"><span aria-hidden="true" className={`flex size-11 items-center justify-center rounded-field ${low?'bg-danger text-white':'bg-white/15'}`}><Icon name={low?'warning':'check'} size={22}/></span><p className="font-display text-[44px] font-extrabold leading-none tracking-[-0.03em] tabular-nums">{t('questions.resultPercent',{pct})}</p></div>}<h2 id="session-score" className="font-display text-[32px] font-extrabold">{report.denominator===0?t('questions.scoreNone'):t(report.denominator===1?'questions.resultScoreOne':'questions.resultScore',{correct:report.correct,denominator:report.denominator})}</h2>
   {pct===null?null:<p className="mt-2 font-semibold">{t(low?'questions.resultLowHint':'questions.resultGoodHint')}</p>}<div className={`mt-4 flex flex-wrap gap-4 ${low?'':'text-on-dark-muted'}`}><p>{report.incorrect===1?t('questions.resultWrongOne'):t('questions.resultWrong',{n:report.incorrect})}</p><p>{report.unanswered===1?t('questions.resultUnansweredOne'):t('questions.resultUnanswered',{n:report.unanswered})}</p><p>{report.annulled===1?t('questions.resultAnnulledOne'):t('questions.resultAnnulled',{n:report.annulled})}</p></div><p className={`mt-4 text-sm ${low?'':'text-on-dark-muted'}`}>{t('questions.annulledInfo')}</p>
  </section>
  {error?<Alert tone="review" role="alert" title={error}/>:null}
  <div className="flex flex-wrap gap-3"><Button loading={busy} disabled={wrong.length===0} onClick={()=>void retry()}>{t('questions.retryWrong')}</Button><Link href="/app/banco-de-questoes?state=wrong" className={actionLink}>{t('questions.errors')}</Link>{session.items.some(item=>item.question.cardIds.length>0)?<Button variant="secondary" loading={busy} onClick={()=>void addReview()}>{t('questions.reviewCards')}</Button>:null}</div>
  {reviewMessage?<p role="status">{reviewMessage}</p>:null}<p className="text-sm text-muted">{t('questions.fsrsInfo')}</p>
  <SubjectResults key={`subjects:${session.id}`} session={session} report={report}/>
  <RecalculationPanel key={`comparison:${session.id}`} sessionId={session.id} items={session.items}/>
  {report.items.map(result=>{const item=items.get(result.itemId);return item?<ResultQuestion key={result.itemId} item={item} result={result}/>:null;})}
 </div>;
}
