'use client';
import {useEffect,useState,type ReactNode,type RefObject} from 'react';
import {Alert,Button,Card,Checkbox,ChoiceRow,Combobox,Icon,Input,Morph,Progress,Ring,Segmented,Select} from '@remoa/ui';
import {EXAM_BUILDER_LIMITS,EXAM_GENERATE_MAX,EXAM_GENERATE_THEME_MAX,type ExamAvailability,type ExamBuilderParams,type HealthCourseCode} from '@remoa/contracts';
import {t} from './labels';
import {CourseField} from '../questions/course-field';
import {type Ai,type Content,type GenDifficulty,type Origin,type PresetId} from './model';

type Opt={id:string;name:string};
type Patch=(p:Partial<ExamBuilderParams>)=>void;
const origins=['catalog','ai','mixed'] as const;
const contents=['area','topic','mode','custom'] as const;
const NO_MAP='none';

/** Step 1: what the exam is (name, optional map, how many questions). Nothing here is asked again later. */
export function StepExam({name,onName,params,patch,board,onBoard,boards}:{name:string;onName:(v:string)=>void;params:ExamBuilderParams;patch:Patch;board:string|null;onBoard:(id:string|null)=>void;boards:Opt[]|null}){
  return <Card><div className="flex flex-col gap-5">
    <Input label={t('examBuilder.name')} placeholder={t('examBuilder.namePlaceholder')} value={name} maxLength={80} onChange={e=>onName(e.target.value)}/>
    <div className="flex flex-col gap-2">
      <Select label={t('examBuilder.mapLabel')} value={board??NO_MAP} onValueChange={v=>onBoard(v===NO_MAP?null:v)}
        options={[{value:NO_MAP,label:t('examBuilder.mapNoneOption')},...(boards??[]).map(b=>({value:b.id,label:b.name}))]}/>
      <p className="m-0 text-[13px] text-muted">{boards&&!boards.length?t('examBuilder.mapNoMaps'):t('examBuilder.mapHelp')}</p>
    </div>
    <div className="flex flex-col gap-2">
      <Input label={t('examBuilder.quantity')} type="number" min={EXAM_BUILDER_LIMITS.minQuestions} max={EXAM_BUILDER_LIMITS.maxQuestions} value={Number.isNaN(params.count)?'':params.count} onChange={e=>patch({count:e.target.value===''?NaN:Number(e.target.value)})}/>
      <div role="group" aria-label={t('examBuilder.quantityShortcuts')} className="flex flex-wrap gap-2">{EXAM_BUILDER_LIMITS.shortcuts.map(n=><Button key={n} size="sm" variant={params.count===n?'primary':'secondary'} aria-pressed={params.count===n} onClick={()=>patch({count:n})}>{t('examBuilder.quantityShortcut',{n})}</Button>)}</div>
    </div>
  </div></Card>;
}

export function StepOrigin({origin,onOrigin,board,ai,onAi,genCount}:{origin:Origin;onOrigin:(o:Origin)=>void;board:string|null;ai:Ai;onAi:(p:Partial<Ai>)=>void;genCount:number}){
  const desc=(o:Origin)=>o==='catalog'?t('examBuilder.originChoices.catalog.description'):board?t(`examBuilder.originChoices.${o}.description`):t(`examBuilder.originChoices.${o}.descriptionTheme`);
  const gens=origin==='mixed'||(origin==='ai'&&(ai.gen||!board));
  return <div className="flex flex-col gap-5">
    <div role="group" aria-label={t('examBuilder.stepTitles.origin')} className="flex flex-col gap-3">
      {origins.map(o=><ChoiceRow key={o} indicator="radio" size="lg" selected={origin===o} onSelect={()=>onOrigin(o)} title={t(`examBuilder.originChoices.${o}.title`)} description={desc(o)}/>)}
    </div>
    {origin!=='catalog'?<Card><div className="flex flex-col gap-5">
      {origin==='ai'&&board?<div className="flex flex-col gap-1">
        <Checkbox checked={ai.use} onCheckedChange={v=>onAi({use:v===true})} label={t('examBuilder.mapUseExisting')}/>
        <Checkbox checked={ai.gen} onCheckedChange={v=>onAi({gen:v===true})} label={t('examBuilder.mapGenerate')}/>
      </div>:null}
      {origin==='ai'&&gens?<p className="m-0 text-sm text-muted">{t('examBuilder.genAuto',{n:genCount})}{genCount>=EXAM_GENERATE_MAX?` ${t('examBuilder.genCap',{max:EXAM_GENERATE_MAX})}`:''}</p>:null}
      {gens?<div className="grid gap-5 sm:grid-cols-2">
        {origin==='mixed'?<Input label={t('examBuilder.genCount')} type="number" min={1} max={EXAM_GENERATE_MAX} value={Number.isNaN(ai.count)?'':ai.count} onChange={e=>onAi({count:e.target.value===''?NaN:Number(e.target.value)})}/>:null}
        <Select label={t('examBuilder.genDifficulty')} value={ai.difficulty} onValueChange={v=>onAi({difficulty:v as GenDifficulty})} options={(['mixed','easy','medium','hard'] as const).map(v=>({value:v,label:t(`examBuilder.genDifficultyOptions.${v}`)}))}/>
      </div>:null}
      <p className="m-0 text-sm text-muted">{t('examBuilder.originAiNote')}</p>
    </div></Card>:null}
  </div>;
}

export function DifficultyField({params,patch}:{params:ExamBuilderParams;patch:Patch}){
  return <div className="flex flex-col gap-2"><span id="eb-diff" className="text-[15px] font-bold">{t('examBuilder.difficulty')}</span>
    <div role="group" aria-labelledby="eb-diff" className="flex flex-wrap gap-2"><Button size="sm" variant={params.difficulties.length?'secondary':'primary'} aria-pressed={params.difficulties.length===0} onClick={()=>patch({difficulties:[]})}>{t('examBuilder.allDifficulties')}</Button>{(['easy','medium','hard'] as const).map(d=>{const on=params.difficulties.includes(d);return <Button key={d} size="sm" variant={on?'primary':'secondary'} aria-pressed={on} onClick={()=>patch({difficulties:on?params.difficulties.filter(x=>x!==d):[...params.difficulties,d]})}>{t(`examBuilder.difficultyOptions.${d}`)}</Button>;})}</div><p className="text-sm text-muted">{t('examBuilder.difficultyCoverageHelp')}</p></div>;
}

/** FR-34: the catalog of the course has no published question. The AI origin still works for any course. */
export function CourseEmpty({course,onMap,onOther}:{course:string;onMap:()=>void;onOther:()=>void}){
  return <Alert tone="watch" role="status" title={t('examBuilder.courseEmpty.title',{course})}>
    <p className="m-0">{t('examBuilder.courseEmpty.help')}</p>
    <div className="flex flex-wrap gap-2"><Button size="sm" variant="secondary" onClick={onMap}>{t('examBuilder.courseEmpty.useMap')}</Button><Button size="sm" variant="secondary" onClick={onOther}>{t('examBuilder.courseEmpty.other')}</Button></div></Alert>;
}

function TopicsField({params,patch,topics}:{params:ExamBuilderParams;patch:Patch;topics:Opt[]}){
  return <Combobox label={t('examBuilder.topics')} placeholder={t('examBuilder.topicsPlaceholder')} options={topics.map(x=>({value:x.id,label:x.name}))} value={params.topicIds} onValueChange={v=>patch({topicIds:v})}
    max={EXAM_BUILDER_LIMITS.maxTopics} maxMessage={t('examBuilder.topicsMax')} emptyLabel={t('examBuilder.topicsEmpty')} removeChipAriaLabel={name=>t('examBuilder.topicRemove',{name})}/>;
}

/** No map: the AI writes about what is ticked here (explicit choice, never "all"). */
export function ThemeCard({params,patch,areas,topics,theme,onTheme}:{params:ExamBuilderParams;patch:Patch;areas:Opt[];topics:Opt[];theme:string;onTheme:(v:string)=>void}){
  const on=new Set(params.areaIds);
  return <Card><div className="flex flex-col gap-5">
    <div className="flex flex-col gap-1"><h3 className="m-0 font-display text-lg font-extrabold">{t('examBuilder.themeTitle')}</h3><p className="m-0 text-sm text-muted">{t('examBuilder.themeHelp')}</p></div>
    <fieldset className="m-0 flex flex-col gap-1 border-0 p-0"><legend className="mb-1 text-[15px] font-bold">{t('examBuilder.areas')}</legend>
      {areas.map(a=><Checkbox key={a.id} checked={on.has(a.id)} label={a.name} onCheckedChange={v=>patch({areaIds:v===true?[...on,a.id]:params.areaIds.filter(x=>x!==a.id)})}/>)}
    </fieldset>
    <TopicsField params={params} patch={patch} topics={topics}/>
    <Input label={t('examBuilder.themeFree')} placeholder={t('examBuilder.themeFreePlaceholder')} value={theme} maxLength={EXAM_GENERATE_THEME_MAX} onChange={e=>onTheme(e.target.value)}/>
  </div></Card>;
}

export function StepContent({catalogFilters,content,onContent,params,patch,av,areaName,toggleArea,topics,preset,presets,onPreset,matrixCount,showCourse,courseName,onCourse,courseEmpty,courseRef,prefilled,theme,areaOpts=[]}:{catalogFilters?:ReactNode;areaOpts?:Opt[];content:Content;onContent:(c:Content)=>void;params:ExamBuilderParams;patch:Patch;av:ExamAvailability|null;areaName:(id:string|null)=>string;toggleArea:(id:string,on:boolean)=>void;topics:Opt[];preset:PresetId|null;presets:readonly PresetId[];onPreset:(id:PresetId)=>void;matrixCount:number;showCourse:boolean;courseName:string;onCourse:(c:HealthCourseCode)=>void;courseEmpty:ReactNode;courseRef:RefObject<HTMLDivElement|null>;prefilled:string|null;theme:ReactNode}){
  const showAreas=content==='area'||content==='custom',showTopics=content==='topic'||content==='custom';
  const chosen=params.areaIds;
  const areaRows=(av?.areas??[]).filter(a=>a.areaId!==null);
  // FR-32: only medicine has a taxonomy (the 7 ENAMED areas). Other courses show the honest empty state, never fake areas.
  const noSubjects=!!params.course&&(content==='topic'||!areaRows.length);
  return <div className="flex flex-col gap-5">
    {showCourse?<div ref={courseRef} className="flex flex-col gap-2">
      <CourseField label={t('examBuilder.course.label')} placeholder={t('examBuilder.course.placeholder')} emptyLabel={t('examBuilder.course.empty')} value={params.course} onChange={onCourse}/>
      <p className="m-0 text-[13px] text-muted">{t('examBuilder.course.help')}</p></div>:null}
    {courseEmpty}
    {prefilled?<Alert tone="brand" role="status" title={t('examBuilder.prefilled',{name:prefilled})}/>:null}
    {theme??<>
    <div role="group" aria-label={t('examBuilder.contentLabel')} className="grid gap-3 sm:grid-cols-2">
      {contents.map(c=><ChoiceRow key={c} indicator="radio" size="lg" selected={content===c} onSelect={()=>onContent(c)} title={t(`examBuilder.contentChoices.${c}.title`)} description={t(`examBuilder.contentChoices.${c}.description`)}/>)}
    </div>
    {matrixCount?<Alert tone="steady" role="status" title={t('examBuilder.matrixKept',{n:matrixCount})}>
      <p className="m-0">{t('examBuilder.topicsFromMap')}</p><div><Button size="sm" variant="secondary" onClick={()=>patch({matrixItemIds:[]})}>{t('examBuilder.matrixClear')}</Button></div></Alert>:null}
    {content==='mode'?<div className="flex flex-col gap-3">
      <div role="group" aria-label={t('examBuilder.presetsLabel')} className="grid gap-3 sm:grid-cols-2">
        {presets.map(id=><ChoiceRow key={id} indicator="radio" size="lg" selected={preset===id} onSelect={()=>onPreset(id)} title={t(`examBuilder.presets.${id}.title`)} description={t(`examBuilder.presets.${id}.description`)} badge={id==='enamed'?t('examBuilder.presets.enamed.tag'):undefined}/>)}
      </div>
      {preset==='enamed'?<p className="m-0 text-sm text-muted">{t('examBuilder.enamedNote')}</p>:null}
    </div>:null}
    {!catalogFilters&&noSubjects&&(showAreas||showTopics)?<Alert tone="steady" role="status" title={t('examBuilder.subjectsNone',{course:courseName})}/>:null}
    {catalogFilters&&(showAreas||showTopics)?<Card><div className="flex flex-col gap-5">{catalogFilters}{content==='custom'?<><DifficultyField params={params} patch={patch}/><Select label={t('examBuilder.progress')} value={params.progress} onValueChange={v=>patch({progress:v as ExamBuilderParams['progress']})} options={(['all','unseen','wrong'] as const).map(v=>({value:v,label:t(`examBuilder.progressOptions.${v}`)}))}/></>:null}</div></Card>:null}
    {!catalogFilters&&(showAreas||showTopics)&&!noSubjects?<Card><div className="flex flex-col gap-5">
      {showAreas?<fieldset className="m-0 flex flex-col gap-1 border-0 p-0"><legend className="mb-1 text-[15px] font-bold">{t('examBuilder.areas')}</legend>
        {areaRows.map(a=>{const id=a.areaId as string;return <Checkbox key={id} checked={chosen.length===0||chosen.includes(id)} onCheckedChange={on=>toggleArea(id,on===true)}
          label={`${areaName(id)} · ${a.available===1?t('examBuilder.areaAvailableOne'):t('examBuilder.areaAvailable',{n:a.available})}`}/>;})}
        {/* AI origin before any question exists: availability has no rows, so offer the taxonomy areas (no counts). */}
        {!areaRows.length?areaOpts.map(a=><Checkbox key={a.id} checked={chosen.includes(a.id)} label={a.name} onCheckedChange={v=>patch({areaIds:v===true?[...new Set([...chosen,a.id])]:chosen.filter(x=>x!==a.id)})}/>):null}
      </fieldset>:null}
      {showTopics&&!params.course?<TopicsField params={params} patch={patch} topics={topics}/>:null}
      {content==='custom'?<div className="grid gap-5 sm:grid-cols-2"><DifficultyField params={params} patch={patch}/>
        <Select label={t('examBuilder.progress')} value={params.progress} onValueChange={v=>patch({progress:v as ExamBuilderParams['progress']})} options={(['all','unseen','wrong'] as const).map(v=>({value:v,label:t(`examBuilder.progressOptions.${v}`)}))}/></div>:null}
    </div></Card>:null}
    </>}
  </div>;
}

/** Name and count live in step 1; here only how the exam runs. */
export function StepFormat({params,patch,content}:{params:ExamBuilderParams;patch:Patch;content:Content}){
  return <Card><div className="flex flex-col gap-5">
    <div className="flex flex-col gap-2"><span className="text-[15px] font-bold">{t('examBuilder.distribution')}</span>
      <Segmented aria-label={t('examBuilder.distribution')} value={params.distribution} onValueChange={v=>patch({distribution:v as ExamBuilderParams['distribution']})} options={(['balanced','proportional'] as const).map(v=>({value:v,label:t(`examBuilder.distributionOptions.${v}`)}))}/></div>
    <div className="grid gap-5 sm:grid-cols-2">
      <div className="flex flex-col gap-2"><span className="text-[15px] font-bold">{t('examBuilder.time')}</span>
        <Segmented aria-label={t('examBuilder.time')} value={String(params.timePerQuestionSec??'none')} onValueChange={v=>patch({timePerQuestionSec:v==='none'?null:(Number(v) as 120|180)})} options={(['none','180','120'] as const).map(v=>({value:v,label:t(`examBuilder.timeOptions.${v}`)}))}/></div>
      <div className="flex flex-col gap-2"><span className="text-[15px] font-bold">{t('examBuilder.mode')}</span>
        <Segmented aria-label={t('examBuilder.mode')} value={params.mode} onValueChange={v=>patch({mode:v as ExamBuilderParams['mode']})} options={(['study','simulation'] as const).map(v=>({value:v,label:t(`examBuilder.modeOptions.${v}`)}))}/></div>
    </div>
    {content!=='custom'?<DifficultyField params={params} patch={patch}/>:null}
    <Checkbox checked={params.shuffle} onCheckedChange={v=>patch({shuffle:v===true})} label={t('examBuilder.shuffle')}/>
  </div></Card>;
}

/** Live "6 de 10" while the AI works: the ring and the bar move, the number morphs, a screen reader hears the same count. */
export function GenProgress({done:target,total}:{done:number;total:number}){
  // The server reports after each chunk of 5; count up one by one in between so the number keeps moving.
  const [done,setDone]=useState(0);
  useEffect(()=>{if(done>=target)return;const id=setTimeout(()=>setDone(d=>Math.min(d+1,target)),140);return()=>clearTimeout(id);},[done,target]);
  const label=t('examBuilder.genProgressLabel',{done:target,total});
  return <div role="status" aria-live="polite" aria-label={label} className="flex items-center gap-4 rounded-card bg-primary-tint p-4">
    <Ring value={done} max={Math.max(total,1)} tone="primary"/>
    <div className="flex min-w-0 flex-1 flex-col gap-2">
      <p aria-hidden="true" className="m-0 font-display text-2xl font-extrabold text-primary-deep"><Morph>{t('examBuilder.genProgress',{done,total})}</Morph></p>
      <Progress aria-label={label} value={done} max={Math.max(total,1)} busy/>
      <p className="m-0 text-sm text-muted">{t('examBuilder.genProgressHelp')}</p>
    </div>
  </div>;
}

/** "Reunimos 9 de 10": informative, not an error. Explains why and offers the way to complete. */
export function ShortfallNote({got,requested,why,children}:{got:number;requested:number;why:string;children?:ReactNode}){
  return <div role="status" className="flex gap-3 rounded-card border border-border bg-surface p-4">
    <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-tint text-primary-deep"><Icon name="help" size={20}/></span>
    <div className="flex min-w-0 flex-col gap-2">
      <p className="m-0 font-display text-base font-bold">{t('examBuilder.shortTitle',{n:got,requested})}</p>
      <p className="m-0 text-sm text-muted">{why}</p>
      {children?<div className="flex flex-wrap gap-2">{children}</div>:null}
    </div>
  </div>;
}
