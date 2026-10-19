'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { t } from './labels';
import { Alert, Button, Icon, Input, Select, Tag, buttonVariants, focusRing } from '@remoa/ui';
import type { ExamPaperPublic, QuestionPublic, HealthCourse, HealthCourseCode } from '@remoa/contracts';
import { getExam, listExamCatalog, listExamCourses, questionError } from './api';
import {useQuestionFeatureFlags} from './flags';
import {SessionHistoryScreen} from './session-history-screen';
import { ConfigDialog, PageTitle, panel, QuestionMeta } from './shared';
import { aiExamHref } from '@/features/exam-builder/train-topic-link';
import { MySessionsSection } from './my-sessions-section';
import { QuestionsSkeleton } from './questions-skeleton';
const examLink = `${focusRing} inline-flex min-h-12 items-center justify-center gap-2 rounded-btn px-5 text-[15px]`;
export const personalizedExamHref = '/app/banco-de-questoes/prova';
export function ExamsScreen({sessionsEnabled=true,builderEnabled=true}:{sessionsEnabled?:boolean;builderEnabled?:boolean}={}) {
  const [exams,setExams]=useState<ExamPaperPublic[]>([]);const [total,setTotal]=useState(0);const [cursor,setCursor]=useState<string|null>(null);
  const [search,setSearch]=useState('');const [query,setQuery]=useState('');const [course,setCourse]=useState('all');
  const [courses,setCourses]=useState<HealthCourse[]>([]);const [courseLoading,setCourseLoading]=useState(true);const [courseError,setCourseError]=useState(false);const [courseRetry,setCourseRetry]=useState(0);
  useEffect(()=>{const abort=new AbortController();setCourseLoading(true);setCourseError(false);void listExamCourses(abort.signal).then(value=>{if(!abort.signal.aborted)setCourses(value.filter(item=>item.kind!=='not_health'));}).catch(()=>{if(!abort.signal.aborted)setCourseError(true);}).finally(()=>{if(!abort.signal.aborted)setCourseLoading(false);});return()=>abort.abort();},[courseRetry]);
  const [loading,setLoading]=useState(true);const [more,setMore]=useState(false);const [error,setError]=useState<string|null>(null);const [version,setVersion]=useState(0);
  const generation=useRef(0);const abortRef=useRef<AbortController|null>(null);const busy=useRef(false);
  useEffect(()=>{const timer=setTimeout(()=>setQuery(search.trim()),250);return()=>clearTimeout(timer);},[search]);
  const request={limit:25,...(course!=='all'?{course:course as HealthCourseCode}:{}),...(query?{search:query}:{})};
  const requestKey=JSON.stringify(request);
  useEffect(()=>{
    abortRef.current?.abort();const abort=new AbortController();abortRef.current=abort;const current=++generation.current;busy.current=true;
    setLoading(true);setMore(false);setError(null);setExams([]);setCursor(null);
    void listExamCatalog(JSON.parse(requestKey),abort.signal).then(value=>{if(!abort.signal.aborted&&current===generation.current){setExams(value.items);setTotal(value.total);setCursor(value.nextCursor);}})
      .catch(reason=>{if(!abort.signal.aborted&&current===generation.current)setError(questionError(reason));})
      .finally(()=>{if(!abort.signal.aborted&&current===generation.current){setLoading(false);busy.current=false;}});
    return()=>abortRef.current?.abort();
  },[version,requestKey]);
  const loadMore=async()=>{
    if(!cursor||busy.current)return;const current=generation.current,abort=new AbortController();abortRef.current=abort;busy.current=true;setMore(true);setError(null);
    try{const value=await listExamCatalog({...JSON.parse(requestKey),cursor},abort.signal);if(!abort.signal.aborted&&current===generation.current){setExams(old=>[...new Map([...old,...value.items].map(paper=>[paper.id,paper])).values()]);setCursor(value.nextCursor);setTotal(value.total);}}
    catch(reason){if(!abort.signal.aborted&&current===generation.current)setError(questionError(reason));}
    finally{if(!abort.signal.aborted&&current===generation.current){busy.current=false;setMore(false);}}
  };
  const filtered=Boolean(query||course!=='all');
  const clear=()=>{setSearch('');setQuery('');setCourse('all');};
  return <div className="mx-auto flex w-full min-w-0 max-w-[1200px] flex-col gap-8 py-2 md:px-6">
    <header><p className="text-xs font-bold uppercase tracking-[.12em] text-muted">{t('questions.eyebrow')}</p><h1 className="mt-2 font-display text-[34px] font-extrabold leading-tight tracking-tight md:text-[44px]">{t('questions.examsTitle')}</h1><p className="mt-3 max-w-2xl text-muted">{t('questions.examsWorkspaceDescription')}</p></header>
    {sessionsEnabled&&builderEnabled?<section aria-labelledby="create-exam-title" className="grid gap-7 rounded-[30px] bg-panel-dark p-5 text-on-dark md:grid-cols-[minmax(0,1fr)_270px] md:p-8">
      <div><p className="text-xs font-bold uppercase tracking-[.12em] text-on-dark-muted">{t('questions.examsYourPace')}</p><h2 id="create-exam-title" className="mt-3 max-w-xl font-display text-[26px] font-extrabold leading-tight md:text-[34px]">{t('questions.examsCreateTitle')}</h2><p className="mt-3 max-w-xl text-on-dark-muted">{t('questions.examsCreateHelp')}</p><div className="mt-6 flex flex-wrap gap-3"><Link className={`${examLink} ${buttonVariants.light}`} href={personalizedExamHref}><Icon name="plus" size={20}/>{t('questions.examsCreate')}</Link><Link className={`${examLink} ${buttonVariants['outline-light']}`} href={aiExamHref}><Icon name="sparkle" size={18}/>{t('questions.examsGenerateAi')}</Link></div></div>
      <div className="hidden flex-col justify-center gap-4 border-l border-white/20 pl-7 text-sm md:flex"><div><p className="font-bold">{t('questions.examsStudyTitle')}</p><p className="mt-1 text-on-dark-muted">{t('questions.examsStudyHelp')}</p></div><div><p className="font-bold">{t('questions.examsSimulationTitle')}</p><p className="mt-1 text-on-dark-muted">{t('questions.examsSimulationHelp')}</p></div></div>
    </section>:null}
    {sessionsEnabled?<MySessionsSection/>:null}
    <section aria-labelledby="official-exams-title" className="min-w-0 rounded-[26px] border border-border bg-surface p-5 md:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><h2 id="official-exams-title" className="font-display text-2xl font-extrabold">{t('questions.examsOfficialTitle')}</h2><p className="mt-2 max-w-2xl text-sm text-muted">{t('questions.examsOfficialHelp')}</p></div><Link className={`${examLink} ${buttonVariants.quiet}`} href="/app/banco-de-questoes">{t('questions.examsBrowseBank')}<Icon name="right" size={18}/></Link></div>
      <div className="mt-6 grid items-end gap-3 md:grid-cols-[minmax(0,1fr)_280px]"><Input type="search" label={t('questions.examsSearch')} placeholder={t('questions.examsSearch')} value={search} onChange={event=>setSearch(event.target.value)}/><Select label={t('questions.examsCourse')} value={course} onValueChange={setCourse} options={[{value:'all',label:t('questions.examsAllCourses')},...courses.map(value=>({value:value.code,label:value.name}))]}/></div>
      {courseLoading?<p role="status" className="mt-3 text-sm text-muted">{t('questions.examsCoursesLoading')}</p>:null}
      {courseError?<div className="mt-4"><Alert role="alert" tone="watch" title={t('questions.examsCoursesError')}><Button variant="secondary" onClick={()=>setCourseRetry(value=>value+1)}>{t('common.retry')}</Button></Alert></div>:null}
      {error?<div className="mt-5"><Alert role="alert" tone="review" title={t('questions.examsLoadError')}><p>{error}</p><Button variant="secondary" onClick={()=>{if(cursor&&exams.length)void loadMore();else setVersion(value=>value+1);}}>{t('common.retry')}</Button></Alert></div>:null}
      {loading?<div className="mt-5"><QuestionsSkeleton cards={1}/></div>:!error&&exams.length===0&&!filtered?<div className="mt-6 flex items-start gap-4 rounded-[20px] bg-canvas p-5"><span className="rounded-[16px] bg-primary-tint p-3 text-primary-deep"><Icon name="file" size={24}/></span><div><h3 className="font-bold">{t('questions.examsNoPapers')}</h3><p className="mt-1 max-w-2xl text-sm text-muted">{t('questions.examsNoPapersHelp')}</p></div></div>:exams.length===0&&filtered&&!error?<div className="mt-6 rounded-[20px] bg-canvas p-5"><h3 className="font-bold">{t('questions.examsNoMatch')}</h3><p className="mt-1 text-sm text-muted">{t('questions.examsNoMatchHelp')}</p><div className="mt-3"><Button variant="secondary" onClick={clear}>{t('questions.clear')}</Button></div></div>:null}
      {!loading&&exams.length>0?<><p className="mt-5 text-sm text-muted" role="status">{t('questions.examsPaperCount',{n:total})}</p><div className="mt-4 grid gap-4 md:grid-cols-2">{exams.map(exam=><article key={exam.id} className="flex min-w-0 flex-col rounded-[20px] border border-border p-5"><div className="flex flex-wrap gap-2"><Tag>{exam.institution}</Tag><Tag tone="unknown">{exam.year}</Tag><Tag tone="unknown">{t(exam.coverage?.kind==='complete'?'questions.examsComplete':exam.coverage?.kind==='source_excerpt'?'questions.examsPartial':'questions.examsCoverageUnknown')}</Tag></div><h3 className="mt-4 break-words font-display text-xl font-bold">{exam.name}</h3>{exam.professionCode?<p className="mt-2 text-sm text-muted">{t('questions.teamProfession',{name:t(`questions.teamProfessions.${exam.professionCode}`)})}</p>:null}<p className="mt-4 text-sm text-muted">{t('questions.examsAvailableCount',{n:exam.coverage?.availableQuestionCount??exam.questionCount})}{exam.coverage?.kind!=='source_excerpt'?<> · {exam.durationSec?t('questions.examDuration',{n:Math.round(exam.durationSec/60)}):t('questions.examNoDuration')}</>:null}</p>{exam.coverage?<p className="mt-2 text-sm text-muted">{t('questions.examsEligibleCount',{n:exam.coverage.scorableQuestionCount})}</p>:null}<div className="mt-5"><Link className={`${examLink} ${buttonVariants.secondary}`} href={`/app/provas/${exam.id}`}>{t(exam.coverage?.kind==='source_excerpt'?'questions.examsOpenSelection':'questions.openExam')}<Icon name="right" size={18}/></Link></div></article>)}</div>{cursor?<div className="mt-5"><Button variant="secondary" loading={more} onClick={()=>void loadMore()}>{t('questions.examsLoadMore')}</Button></div>:null}{filtered?<div className="mt-4"><Button variant="quiet" onClick={clear}>{t('questions.clear')}</Button></div>:null}</>:null}
    </section>
  </div>;
}
export function ExamDetailScreen({examId,sessionsEnabled=true}:{examId:string;sessionsEnabled?:boolean}) {
  const [exam,setExam]=useState<{paper:ExamPaperPublic;questions:QuestionPublic[]}|null>(null);const [loading,setLoading]=useState(true);const [error,setError]=useState<string|null>(null);const [version,setVersion]=useState(0);const [config,setConfig]=useState(false);
  useEffect(()=>{const abort=new AbortController();setLoading(true);setError(null);setExam(null);void getExam(examId,abort.signal).then(value=>{if(!abort.signal.aborted)setExam(value);}).catch(reason=>{if(!abort.signal.aborted)setError(questionError(reason));}).finally(()=>{if(!abort.signal.aborted)setLoading(false);});return()=>abort.abort();},[examId,version]);
  if(loading)return <div className="mx-auto w-full max-w-[1100px] py-2 md:px-6"><QuestionsSkeleton cards={2}/></div>;
  if(!exam)return <Alert role="alert" tone="review" title={error??t('questions.examDetailError')}><Button variant="secondary" onClick={()=>setVersion(value=>value+1)}>{t('common.retry')}</Button></Alert>;
  const coverage=exam.paper.coverage;const partial=coverage?.kind==='source_excerpt';
  const eligible=coverage?.scorableQuestionCount??exam.paper.questionCount;const count=partial?Math.min(eligible,200):exam.paper.questionCount;
  return <div className="mx-auto flex w-full min-w-0 max-w-[1100px] flex-col gap-6 py-2 md:px-6">
    <div><Link className={`${examLink} ${buttonVariants.quiet}`} href="/app/provas"><Icon name="left" size={18}/>{t('questions.examsBack')}</Link></div>
    <PageTitle title={exam.paper.name} description={`${exam.paper.institution} · ${exam.paper.year}`}><Button disabled={!sessionsEnabled||count===0||exam.paper.status!=='published'} onClick={()=>setConfig(true)}>{t(partial?'questions.examsStartEligible':'questions.startExam',{n:count})}</Button></PageTitle>
    <Alert tone={coverage?.kind==='complete'?'steady':'watch'} title={t(coverage?.kind==='complete'?'questions.examsComplete':partial?'questions.examsPartial':'questions.examsCoverageUnknown')}>
      <p>{t(partial?'questions.examsPartialHelp':coverage?.kind==='complete'?'questions.examOriginal':'questions.examsUnknownHelp')}</p>
      <p>{t('questions.examsAvailableCount',{n:coverage?.availableQuestionCount??exam.paper.questionCount})} · {t('questions.examsEligibleCount',{n:eligible})}</p>
      {partial?<p>{t('questions.examsNotScoredHelp')}</p>:null}{partial&&eligible>200?<p>{t('questions.examsStartLimit')}</p>:null}{eligible===0?<p>{t('questions.examsNoEligible')}</p>:null}
    </Alert>
    {exam.questions.map(question=>{const original=question.occurrences?.items.find(item=>item.examId===examId)?.originalNumber;return <article className={panel} key={question.id}>{original?<p className="mb-3 text-sm font-bold text-muted">{t('questions.originalNumber',{n:original})}</p>:null}<QuestionMeta question={question}/><h2 className="mt-4 whitespace-pre-wrap break-words font-display text-xl font-bold">{question.stem}</h2></article>;})}
    {config?<ConfigDialog examId={examId} selectionKind={partial?'source_excerpt':undefined} count={count} timerSec={exam.paper.durationSec} open onOpenChange={setConfig}/>:null}
  </div>;
}
export function SessionsScreen({enabled}:{enabled?:boolean}={}){const flags=useQuestionFeatureFlags();return <SessionHistoryScreen enabled={enabled??flags.sessions}/>;}
