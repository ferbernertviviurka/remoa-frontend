'use client';
import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {useRouter} from 'next/navigation';
import {Alert,Button,Card,Icon,Progress,Stepper,Tag} from '@remoa/ui';
import {type ExamAvailability,type HealthCourseCode,type ExamBuilderParams,type ExamGenerateResult,type ExamPreviewItem,type ExamTemplate,type QuestionSessionConfig} from '@remoa/contracts';
import {calendarApi} from '@/features/calendar/api';
import {t} from './labels';
import {errorTag,generateExamQuestions,getAvailability,getPreview,listAreas,listBoards,listTemplates,listTopics,revalidate,saveTemplate,startBuilderSession,swapQuestion,QuestionsApiError} from './api';
import {applyPreset,compose,defaultAi,defaultParams,filterOf,idempotencyKey,needsGenerate,originOf,presetIdsFor,sourceOf,stepError,validCount,validGen,type Ai,type Content,type Origin,type PresetId} from './model';
import {CourseEmpty,StepContent,StepFormat,StepOrigin} from './steps';
import {useStudyProfile} from '../study-profile/use-study-profile';
import {catalogCourse,useCourseOptions} from '../questions/course-field';
import {PreviewList} from './preview-list';
import {ActiveDialog,ChangedDialog,ConfirmDialog,FieldDialog,type Changed} from './dialogs';

export type BuilderInit={ids:string[];matrixItemIds:string[];source?:'ai';preset?:PresetId};
type Load='loading'|'ready'|'error';
const stepIds=['origin','content','format','review'] as const;
const LAST=3;
type SummaryKey='summaryOrigin'|'summaryMap'|'summaryContent'|'summaryQuestions'|'summaryTime'|'summaryMode'|'summaryDistribution'|'summaryOrder';
type Opt={id:string;name:string};
const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};

export function BuilderScreen({init}:{init:BuilderInit}){
  const router=useRouter();
  const {profile,capabilities,loaded}=useStudyProfile();
  // FR-31: null = still the profile's course; a pick (null = medicine) or a template wins. Until the profile is read nothing is fetched.
  const [picked,setPicked]=useState<HealthCourseCode|null|undefined>(undefined);
  const courseRef=useRef<HTMLDivElement>(null);
  const [raw,setParams]=useState<ExamBuilderParams>(()=>{
    const base=defaultParams({matrixItemIds:init.matrixItemIds,...(init.source?{source:'ai' as const}:{}),count:Math.min(200,Math.max(20,init.ids.length))});
    return init.ids.length?{...base,count:init.ids.length}:init.preset?applyPreset(base,init.preset):base;
  });
  const profileCourse=catalogCourse(profile?.course);
  const params=useMemo<ExamBuilderParams>(()=>({...raw,course:picked!==undefined?picked:profileCourse}),[raw,picked,profileCourse]);
  const {name:courseName}=useCourseOptions(params.course);
  const [preset,setPreset]=useState<PresetId|null>(init.preset??(init.ids.length?null:'blank'));
  const [step,setStep]=useState(init.ids.length?2:init.matrixItemIds.length||init.preset?1:0);
  const [content,setContent]=useState<Content>(init.preset?'mode':init.ids.length?'custom':'area');
  const [ai,setAi]=useState<Ai>(defaultAi);
  const [stepErr,setStepErr]=useState<string|null>(null);
  const [boards,setBoards]=useState<Opt[]|null>(null);const [topics,setTopics]=useState<Opt[]>([]);
  const [gen,setGen]=useState<{busy:boolean;result:ExamGenerateResult|null;error:string|null}>({busy:false,result:null,error:null});
  const [genTick,setGenTick]=useState(0);
  const heading=useRef<HTMLHeadingElement>(null);const firstStep=useRef(true);
  const fetched=useRef('');
  const [name,setName]=useState(t('examBuilder.defaultName'));
  const [templateId,setTemplateId]=useState<string|null>(null);
  const [areas,setAreas]=useState<Map<string,string>>(new Map());
  const [av,setAv]=useState<ExamAvailability|null>(null);const [avState,setAvState]=useState<Load>('loading');
  const [seed,setSeed]=useState<string|null>(null);const [items,setItems]=useState<ExamPreviewItem[]>([]);const [pvState,setPvState]=useState<Load>('loading');
  const [pinned,setPinned]=useState<Set<string>>(()=>new Set(init.ids));
  const excluded=useRef<Set<string>>(new Set());const pinnedRef=useRef(pinned);pinnedRef.current=pinned;
  const [tick,setTick]=useState(0);const [swapBusy,setSwapBusy]=useState<string|null>(null);const [swapMsg,setSwapMsg]=useState<string|null>(null);
  const [templates,setTemplates]=useState<{items:ExamTemplate[];limit:number|null}|null>(null);
  const [dialog,setDialog]=useState<'confirm'|'template'|'calendar'|null>(null);
  const [busy,setBusy]=useState(false);const [startError,setStartError]=useState<string|null>(null);
  const [changed,setChanged]=useState<Changed>(null);const [checking,setChecking]=useState(false);const [active,setActive]=useState<string|null>(null);
  const [notice,setNotice]=useState<{tone:'steady'|'review';text:string}|null>(null);
  const [dialogError,setDialogError]=useState<string|null>(null);

  const patch=(p:Partial<ExamBuilderParams>)=>{setParams(v=>({...v,...p}));setPreset(null);setTemplateId(null);};
  const countOk=validCount(params.count);
  const areaName=useCallback((id:string|null)=>id===null?t('examBuilder.areaNone'):areas.get(id)??t('examBuilder.areaUnknown'),[areas]);

  useEffect(()=>{let live=true;listAreas().then(a=>live&&setAreas(new Map(a.map(x=>[x.id,x.name])))).catch(()=>undefined);listTemplates().then(r=>live&&setTemplates(r)).catch(()=>undefined);
    listBoards().then(b=>live&&setBoards(b.map(x=>({id:x.id,name:x.title})))).catch(()=>live&&setBoards([]));listTopics().then(x=>live&&setTopics(x)).catch(()=>undefined);return()=>{live=false;};},[]);
  useEffect(()=>{if(firstStep.current){firstStep.current=false;return;}heading.current?.focus();},[step]);

  // FR-24: availability (never draws). Area choice is applied locally, so it is asked with every area.
  const filterKey=JSON.stringify(filterOf(params));const avOn=step>=1&&loaded;
  useEffect(()=>{
    if(!avOn)return;
    const ac=new AbortController();setAvState('loading');
    getAvailability(JSON.parse(filterKey),ac.signal).then(r=>{setAv(r);setAvState('ready');}).catch(()=>{if(!ac.signal.aborted)setAvState('error');});
    return()=>ac.abort();
  },[filterKey,genTick,avOn]);

  // FR-27: preview proposal. Debounced; pinned/excluded read from refs so pinning does not redraw.
  const paramsKey=JSON.stringify(params)+':'+tick+':'+genTick;
  useEffect(()=>{
    if(!countOk||!loaded||step!==LAST||fetched.current===paramsKey)return;
    const ac=new AbortController();setPvState('loading');
    const id=setTimeout(()=>{
      const p={...params,count:Math.max(params.count,pinnedRef.current.size)};
      getPreview(p,[...pinnedRef.current],[...excluded.current],undefined,ac.signal).then(r=>{
        fetched.current=paramsKey;setSeed(r.seed);setItems(r.items);setPvState('ready');setSwapMsg(null);
        setPinned(new Set(r.items.filter(i=>i.pinned||pinnedRef.current.has(i.questionId)).map(i=>i.questionId)));
      }).catch(()=>{if(!ac.signal.aborted)setPvState('error');});
    },300);
    return()=>{clearTimeout(id);ac.abort();};
    // eslint-disable-next-line react-hooks/exhaustive-deps -- paramsKey is the serialised params + reshuffle tick
  },[paramsKey,countOk,step,loaded]);

  const alloc=useMemo(()=>av?compose(av,params,items,pinned):null,[av,params,items,pinned]);
  const total=items.length;
  const chosenAreas=params.areaIds;
  const allAreaIds=(av?.areas??[]).flatMap(a=>a.areaId===null?[]:[a.areaId]);
  // [] = every area; never lets the last chosen area be unchecked (an empty selection would mean "all").
  const toggleArea=(id:string,on:boolean)=>{const base=chosenAreas.length?chosenAreas:allAreaIds;const next=on?[...new Set([...base,id])]:base.filter(x=>x!==id);if(!next.length)return;patch({areaIds:next.length===allAreaIds.length?[]:next});};
  const shown=step===LAST?total:validCount(params.count)?params.count:0;
  const minutes=params.timePerQuestionSec?Math.ceil(shown*params.timePerQuestionSec/60):null;
  const hasAi=params.source!=='catalog'||items.some(i=>i.origin==='ai_generated');
  const origin=originOf(params.source);
  const boardName=boards?.find(b=>b.id===params.boardId)?.name;
  const noNarrowing=!params.topicIds.length&&!params.matrixItemIds.length&&!params.difficulties.length&&params.progress==='all';
  // FR-34: the course has no published catalog (availability 0 with no narrowing filter). Map/AI origins are never affected.
  const courseEmpty=origin==='catalog'&&!!params.course&&avState==='ready'&&av?.total===0&&noNarrowing;
  const presets=presetIdsFor(params.course,params.course===profileCourse?capabilities.starterTemplates:undefined);
  const pickCourse=(code:HealthCourseCode)=>{const c=catalogCourse(code);if(c===params.course)return;setPicked(c);setContent('area');setPreset(null);setTemplateId(null);setStepErr(null);setParams(p=>({...p,areaIds:[],topicIds:[]}));};
  const otherCourse=()=>{go(1);setTimeout(()=>courseRef.current?.querySelector('input')?.focus(),0);};
  const emptyBox=courseEmpty?<CourseEmpty course={courseName} onMap={()=>{setOrigin('map');go(0);}} onOther={otherCourse}/>:null;
  const needGen=needsGenerate(origin,ai)&&!!params.boardId;
  const setOrigin=(o:Origin)=>{setParams(p=>({...p,source:sourceOf(o),boardId:o==='catalog'?null:p.boardId}));setTemplateId(null);setStepErr(null);if(o==='map'&&!ai.use&&!ai.gen)setAi(a=>({...a,use:true}));};
  const pickContent=(c:Content)=>{setContent(c);setStepErr(null);setTemplateId(null);setParams(p=>({...p,areaIds:c==='area'||c==='custom'?p.areaIds:[],topicIds:c==='topic'||c==='custom'?p.topicIds:[],...(c==='area'||c==='topic'?{progress:'all' as const}:{})}));};
  const go=(to:number)=>{setStepErr(null);setStep(to);};
  const next=()=>{const e=stepError(step,{origin,ai,content,params});if(e)setStepErr(t(`examBuilder.errors.${e}`));else go(step+1);};
  const generate=async()=>{
    if(!params.boardId||!validGen(ai.count))return;
    setGen({busy:true,result:null,error:null});
    try{const r=await generateExamQuestions({boardId:params.boardId,count:ai.count,difficulty:ai.difficulty});
      const ids=new Set([...pinnedRef.current,...r.questionIds]);r.questionIds.forEach(id=>excluded.current.delete(id));
      setPinned(ids);setParams(p=>({...p,count:origin==='map'&&!ai.use&&ids.size?ids.size:Math.max(p.count,ids.size)}));setGenTick(v=>v+1);setGen({busy:false,result:r,error:null});}
    catch(e){setGen({busy:false,result:null,error:e instanceof QuestionsApiError&&(e.code==='quota_exceeded'||e.detail==='quota_exceeded')?t('examBuilder.genStoppedQuota'):t('examBuilder.genError')});}
  };

  const swap=async(id:string)=>{
    if(!seed)return;setSwapBusy(id);setSwapMsg(null);
    try{const item=await swapQuestion({...params,count:Math.max(total,1)},seed,id,items.map(i=>i.questionId),[...excluded.current]);
      setItems(list=>list.map(i=>i.questionId===id?item:i));setPinned(p=>{const n=new Set(p);n.delete(id);return n;});}
    catch(e){setSwapMsg(errorTag(e,'no_replacement')!==null?t('examBuilder.swapNone'):t('examBuilder.previewError'));}
    finally{setSwapBusy(null);}
  };
  const remove=(id:string)=>{excluded.current.add(id);setItems(l=>l.filter(i=>i.questionId!==id));setPinned(p=>{const n=new Set(p);n.delete(id);return n;});};
  const pin=(id:string)=>setPinned(p=>{const n=new Set(p);if(n.has(id))n.delete(id);else n.add(id);return n;});

  // Questions generated from the previous map are not in the new map's pool: unpin them and allow a new generation.
  const changeBoard=(id:string|null)=>{const old=new Set(gen.result?.questionIds??[]);setPinned(p=>new Set([...p].filter(x=>!old.has(x))));setGen({busy:false,result:null,error:null});setParams(p=>({...p,boardId:id}));setStepErr(null);};
  const applyTemplate=(tpl:ExamTemplate)=>{setParams(tpl.params);setPicked(tpl.params.course);setName(tpl.name);setTemplateId(tpl.id);setPreset(null);setContent('custom');setAi(defaultAi);setGen({busy:false,result:null,error:null});go(LAST);};

  const begin=async()=>{
    if(!total)return;
    const p:ExamBuilderParams={...params,count:total};
    const config:QuestionSessionConfig={mode:p.mode,questionIds:items.map(i=>i.questionId),count:total,timerSec:p.timePerQuestionSec?p.timePerQuestionSec*total:null,shuffle:p.shuffle,
      builder:{seed:seed!,params:p,templateId}};
    const key=idempotencyKey(JSON.stringify(config));
    setBusy(true);setStartError(null);
    try{const s=await startBuilderSession(config,key);router.push(`/app/simulados/${s.id}`);}
    catch(e){
      const act=errorTag(e,'active_session_exists');
      if(act!==null){setDialog(null);setActive(act);}
      else if(errorTag(e,'exam_changed')!==null){setDialog(null);setChecking(true);
        try{const r=await revalidate(p,config.questionIds!);setChanged({unavailable:r.unavailable,updated:r.updated});}catch{setStartError(t('examBuilder.startError'));setDialog('confirm');}
        finally{setChecking(false);}}
      else setStartError(t('examBuilder.startError'));
    }finally{setBusy(false);}
  };
  const acceptChanges=()=>{
    if(changed){
      const gone=new Set(changed.unavailable);const latest=new Map(changed.updated.map(u=>[u.id,u.latestId]));
      gone.forEach(id=>excluded.current.add(id));
      setItems(l=>l.filter(i=>!gone.has(i.questionId)).map(i=>latest.has(i.questionId)?{...i,questionId:latest.get(i.questionId)!}:i));
      setPinned(p=>new Set([...p].filter(id=>!gone.has(id)).map(id=>latest.get(id)??id)));
    }
    setChanged(null);
  };

  const submitTemplate=async(n:string)=>{
    setDialogError(null);
    try{const r=await saveTemplate(n.trim(),{...params,count:countOk?params.count:20});setTemplates(v=>v?{...v,items:[r,...v.items]}:v);setDialog(null);setNotice({tone:'steady',text:t('examBuilder.templateSaved')});}
    catch(e){setDialogError(e instanceof QuestionsApiError&&(e.code==='limit_reached'||e.detail==='limit_reached')?t('examBuilder.templateLimitReached'):t('examBuilder.templateError'));}
  };
  const submitCalendar=async(date:string)=>{
    setDialogError(null);
    try{
      const labels=await calendarApi.labels();if(!labels.ok)throw new Error('labels');
      const label=labels.data.labels.find(l=>l.systemKey==='exam')??labels.data.labels[0];if(!label)throw new Error('labels');
      const r=await calendarApi.create({title:t('examBuilder.calendarEventTitle'),labelId:label.id,date,allDay:true,description:name});
      if(!r.ok)throw new Error('create');
      setDialog(null);setNotice({tone:'steady',text:t('examBuilder.calendarSaved')});
    }catch{setDialogError(t('examBuilder.calendarError'));}
  };

  const stepLabels=stepIds.map(id=>t(`examBuilder.steps.${id}`));
  const row=(k:SummaryKey,v:string):[SummaryKey,string]=>[k,v];
  const summaryRows=[
    row('summaryOrigin',t(`examBuilder.originChoices.${origin}.title`)),
    ...(origin!=='catalog'&&boardName?[row('summaryMap',boardName)]:[]),
    row('summaryContent',t(`examBuilder.contentChoices.${content}.title`)),
    row('summaryQuestions',String(shown)),
    row('summaryTime',minutes?t('examBuilder.summaryTimeValue',{n:minutes}):t('examBuilder.summaryTimeNone')),
    row('summaryMode',t(`examBuilder.modeOptions.${params.mode}`)),
    ...(step>=2?[row('summaryDistribution',t(`examBuilder.distributionOptions.${params.distribution}`)),row('summaryOrder',t(params.shuffle?'examBuilder.orderShuffled':'examBuilder.orderFixed'))]:[]),
  ];
  const genResult=gen.result;

  return <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-6 py-2 md:px-6">
    <header>
      <p className="mb-3 text-xs font-bold uppercase tracking-[.12em] text-muted">{t('examBuilder.eyebrow')}</p>
      <h1 className="m-0 font-display text-[34px] font-extrabold leading-[1.1] tracking-[-0.03em] md:text-[44px]">{t('examBuilder.title')}</h1>
      <p className="mt-3 text-muted">{t('examBuilder.subtitle')}</p>
    </header>
    <Stepper aria-label={t('examBuilder.stepsLabel')} doneLabel={t('examBuilder.stepDone')} current={step} steps={stepLabels}/>
    {notice?<Alert tone={notice.tone} role="status" title={notice.text}/>:null}
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="flex min-w-0 flex-col gap-6">
        <h2 ref={heading} tabIndex={-1} className="m-0 font-display text-2xl font-extrabold outline-none">{t(`examBuilder.stepTitles.${stepIds[step]!}`)}</h2>
        {step===0?<StepOrigin origin={origin} onOrigin={setOrigin} boardId={params.boardId} onBoard={changeBoard} boards={boards} ai={ai} onAi={p=>{setAi(a=>({...a,...p}));setStepErr(null);}}/>:null}
        {step===1?<StepContent content={content} onContent={pickContent} params={params} patch={patch} av={av} areaName={areaName} toggleArea={toggleArea} topics={topics} preset={preset} presets={presets} showCourse={origin!=='map'} courseName={courseName} onCourse={pickCourse} courseEmpty={emptyBox} courseRef={courseRef} matrixCount={params.matrixItemIds.length}
          onPreset={id=>{setParams(p=>applyPreset(p,id));setPreset(id);setTemplateId(null);}}/>:null}
        {step===2?<StepFormat name={name} onName={setName} params={params} patch={patch} content={content}/>:null}
        {stepErr?<Alert tone="review" role="alert" title={stepErr}/>:null}

        {step===LAST?<>
          {needGen?<Card><div className="flex flex-col gap-3">
            <h3 className="m-0 font-display text-lg font-extrabold">{t('examBuilder.genTitle')}</h3>
            <p className="m-0 text-sm text-muted">{t('examBuilder.genQuota',{n:Math.ceil((validGen(ai.count)?ai.count:1)/10)})}</p>
            <p className="m-0 text-sm text-muted">{t('examBuilder.genPending')}</p>
            {genResult?null:<div><Button disabled={!validGen(ai.count)} loading={gen.busy} loadingLabel={t('examBuilder.genBusy')} onClick={()=>void generate()}>{ai.count===1?t('examBuilder.genButtonOne'):t('examBuilder.genButton',{n:validGen(ai.count)?ai.count:0})}</Button></div>}
            {genResult?<Alert tone={genResult.stoppedBy?'watch':'steady'} role="status" title={t('examBuilder.genDone',{reused:genResult.reused,generated:genResult.generated})}>
              {genResult.shortfall>0?<p className="m-0">{t('examBuilder.genShort',{n:genResult.reused+genResult.generated,requested:genResult.requested})}</p>:null}
              {genResult.stoppedBy?<p className="m-0">{t(genResult.stoppedBy==='quota'?'examBuilder.genStoppedQuota':'examBuilder.genStoppedError')}</p>:null}</Alert>:null}
            {gen.error?<Alert tone="review" role="alert" title={gen.error}/>:null}
          </div></Card>:null}
        {emptyBox}
        <section aria-label={t('examBuilder.composition')} aria-live="polite" className="flex flex-col gap-3">
          <h2 className="m-0 font-display text-xl font-extrabold">{avState==='loading'&&!av?t('examBuilder.availabilityLoading'):av?(av.total===0?t('examBuilder.foundNone'):av.total===1?t('examBuilder.foundOne'):t('examBuilder.found',{n:av.total})):t('examBuilder.composition')}</h2>
          {avState==='error'?<Alert tone="review" role="alert" title={t('examBuilder.availabilityError')}/>:null}
          {alloc?<ul aria-label={t('examBuilder.composition')} className="m-0 flex list-none flex-col gap-3 p-0">{alloc.rows.map(r=><li key={r.areaId??'none'} className="flex flex-col gap-1">
            <span className="text-sm">{t('examBuilder.compositionRow',{area:areaName(r.areaId),allocated:r.allocated,available:r.available})}</span>
            <Progress size="sm" aria-label={areaName(r.areaId)} value={r.allocated} max={Math.max(r.target,r.allocated,1)}/></li>)}</ul>:null}
          {alloc&&alloc.shortfall>0&&countOk?<Alert tone="watch" role="alert" title={t('examBuilder.shortfallTitle',{allocated:alloc.allocated,requested:alloc.requested})}>
            <ul className="m-0 list-disc pl-5">{alloc.rows.filter(r=>r.allocated<r.target).map(r=><li key={r.areaId??'none'}>{t('examBuilder.shortfallArea',{area:areaName(r.areaId),allocated:r.allocated,target:r.target})}</li>)}</ul>
            <div className="flex flex-wrap gap-2">
              {params.source==='catalog'?<Button size="sm" variant="secondary" onClick={()=>patch({source:'catalog_and_ai'})}>{t('examBuilder.shortfallAddAi')}</Button>:null}
              {alloc.allocated>=1?<Button size="sm" variant="secondary" onClick={()=>patch({count:alloc.allocated})}>{t('examBuilder.shortfallAccept',{n:alloc.allocated})}</Button>:null}
            </div></Alert>:null}
        </section>

        <section aria-label={t('examBuilder.preview')} className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="m-0 font-display text-xl font-extrabold">{t('examBuilder.preview')}</h2>
            <Button variant="secondary" size="sm" disabled={!countOk} onClick={()=>setTick(v=>v+1)}>{t('examBuilder.reshuffle')}</Button></div>
          <p className="m-0 text-sm text-muted">{t('examBuilder.previewHelp')} {t('examBuilder.reshuffleHelp')}</p>
          {pvState==='loading'?<p role="status" className="m-0 text-muted">{t('examBuilder.previewLoading')}</p>:null}
          {pvState==='error'?<Alert tone="review" role="alert" title={t('examBuilder.previewError')}><Button size="sm" variant="secondary" onClick={()=>setTick(v=>v+1)}>{t('examBuilder.retry')}</Button></Alert>:null}
          {swapMsg?<Alert tone="watch" role="status" title={swapMsg}/>:null}
          {pvState==='ready'&&!items.length?<p className="m-0 text-muted">{t('examBuilder.previewEmpty')}</p>:null}
          {items.length?<PreviewList items={items} pinned={pinned} areaName={areaName} busyId={swapBusy} onSwap={id=>void swap(id)} onRemove={remove} onPin={pin}/>:null}
        </section>
        </>:null}
        <div className="flex flex-wrap gap-3">
          {step>0?<Button variant="secondary" size="lg" icon={<Icon name="left" size={20}/>} onClick={()=>go(step-1)}>{t('examBuilder.prev')}</Button>:null}
          {step<LAST?<Button size="lg" iconEnd={<Icon name="right" size={20}/>} onClick={next}>{t('examBuilder.next')}</Button>:null}
        </div>
      </div>

      <aside aria-label={t('examBuilder.summary')} className="flex flex-col gap-4 lg:sticky lg:top-6">
        <Card><div className="flex flex-col gap-3">
          <h2 className="m-0 font-display text-xl font-extrabold">{t('examBuilder.summary')}</h2>
          <dl className="m-0 flex flex-col gap-2 text-[15px]">
            {summaryRows.map(([k,v])=><div key={k} className="flex justify-between gap-3"><dt className="text-muted">{t(`examBuilder.${k}`)}</dt><dd className="m-0 text-right font-semibold">{v}</dd></div>)}
          </dl>
          {step===LAST?<>
            <Button disabled={total===0||pvState!=='ready'||courseEmpty} onClick={()=>{setStartError(null);setDialog('confirm');}}>{t('examBuilder.start')}</Button>
            {total===0?<p className="m-0 text-sm text-muted">{t('examBuilder.startDisabledHint')}</p>:null}
            <Button variant="secondary" onClick={()=>{setDialogError(null);setDialog('template');}}>{t('examBuilder.saveTemplate')}</Button>
            <Button variant="secondary" onClick={()=>{setDialogError(null);setDialog('calendar');}}>{t('examBuilder.calendar')}</Button>
          </>:null}
        </div></Card>
        <section aria-label={t('examBuilder.templates')} className="flex flex-col gap-2">
          <h2 className="m-0 font-display text-base font-extrabold">{t('examBuilder.templates')}</h2>
          {templates&&templates.limit!==null?<Tag tone="unknown">{t('examBuilder.templatesLimit',{n:templates.items.length,limit:templates.limit})}</Tag>:null}
          {templates&&!templates.items.length?<p className="m-0 text-sm text-muted">{t('examBuilder.templatesEmpty')}</p>:null}
          {templates?.items.map(tpl=><Button key={tpl.id} variant="quiet" size="sm" align="start" onClick={()=>applyTemplate(tpl)}>{t('examBuilder.templatesApply',{name:tpl.name})}</Button>)}
        </section>
      </aside>
    </div>

    <ConfirmDialog open={dialog==='confirm'} onOpenChange={v=>setDialog(v?'confirm':null)} count={total} minutes={minutes} mode={params.mode} hasAi={hasAi} busy={busy} error={startError} onStart={()=>void begin()}/>
    <FieldDialog open={dialog==='template'} onOpenChange={v=>setDialog(v?'template':null)} title={t('examBuilder.templateDialogTitle')} description={t('examBuilder.templateDialogDescription')} label={t('examBuilder.name')} type="text" initial={name} action={t('examBuilder.templateSave')} error={dialogError} onSubmit={submitTemplate}/>
    <FieldDialog open={dialog==='calendar'} onOpenChange={v=>setDialog(v?'calendar':null)} title={t('examBuilder.calendarDialogTitle')} description={t('examBuilder.calendarDialogDescription')} label={t('examBuilder.calendarDate')} type="date" initial={today()} action={t('examBuilder.calendarSave')} error={dialogError} onSubmit={submitCalendar}/>
    <ChangedDialog changed={changed} checking={checking} onClose={()=>setChanged(null)} onAccept={acceptChanges}/>
    <ActiveDialog sessionId={active} onClose={()=>setActive(null)}/>
  </div>;
}
