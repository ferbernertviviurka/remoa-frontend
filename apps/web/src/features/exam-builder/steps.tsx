'use client';
import {Alert,Button,Card,Checkbox,ChoiceRow,Combobox,Input,Segmented,Select} from '@remoa/ui';
import {EXAM_BUILDER_LIMITS,EXAM_GENERATE_MAX,type ExamAvailability,type ExamBuilderParams} from '@remoa/contracts';
import {t} from './labels';
import {presetIds,type Ai,type Content,type GenDifficulty,type Origin,type PresetId} from './model';

type Opt={id:string;name:string};
type Patch=(p:Partial<ExamBuilderParams>)=>void;
const origins=['catalog','map','mixed'] as const;
const contents=['area','topic','mode','custom'] as const;

export function StepOrigin({origin,onOrigin,boardId,onBoard,boards,ai,onAi}:{origin:Origin;onOrigin:(o:Origin)=>void;boardId:string|null;onBoard:(id:string|null)=>void;boards:Opt[]|null;ai:Ai;onAi:(p:Partial<Ai>)=>void}){
  const mapOpts=(boards??[]).map(b=>({value:b.id,label:b.name}));
  return <div className="flex flex-col gap-5">
    <div role="group" aria-label={t('examBuilder.stepTitles.origin')} className="flex flex-col gap-3">
      {origins.map(o=><ChoiceRow key={o} indicator="radio" size="lg" selected={origin===o} onSelect={()=>onOrigin(o)} title={t(`examBuilder.originChoices.${o}.title`)} description={t(`examBuilder.originChoices.${o}.description`)}/>)}
    </div>
    {origin!=='catalog'?<Card><div className="flex flex-col gap-5">
      {boards&&!boards.length?<Alert tone="watch" title={t('examBuilder.mapNone')}/>:<Select label={t('examBuilder.mapLabel')} placeholder={t('examBuilder.mapPlaceholder')} options={mapOpts} value={boardId??''} onValueChange={v=>onBoard(v||null)}/>}
      {origin==='map'?<div className="flex flex-col gap-1">
        <Checkbox checked={ai.use} onCheckedChange={v=>onAi({use:v===true})} label={t('examBuilder.mapUseExisting')}/>
        <Checkbox checked={ai.gen} onCheckedChange={v=>onAi({gen:v===true})} label={t('examBuilder.mapGenerate')}/>
      </div>:<p className="m-0 text-sm text-muted">{t('examBuilder.originAiNote')}</p>}
      {origin==='mixed'||ai.gen?<div className="grid gap-5 sm:grid-cols-2">
        <Input label={t('examBuilder.genCount')} type="number" min={1} max={EXAM_GENERATE_MAX} value={Number.isNaN(ai.count)?'':ai.count} onChange={e=>onAi({count:e.target.value===''?NaN:Number(e.target.value)})}/>
        <Select label={t('examBuilder.genDifficulty')} value={ai.difficulty} onValueChange={v=>onAi({difficulty:v as GenDifficulty})} options={(['mixed','easy','medium','hard'] as const).map(v=>({value:v,label:t(`examBuilder.genDifficultyOptions.${v}`)}))}/>
      </div>:null}
    </div></Card>:null}
  </div>;
}

export function DifficultyField({params,patch}:{params:ExamBuilderParams;patch:Patch}){
  return <div className="flex flex-col gap-2"><span id="eb-diff" className="text-[15px] font-bold">{t('examBuilder.difficulty')}</span>
    <div role="group" aria-labelledby="eb-diff" className="flex flex-wrap gap-2">{(['easy','medium','hard'] as const).map(d=>{const on=params.difficulties.includes(d);return <Button key={d} size="sm" variant={on?'primary':'secondary'} aria-pressed={on} onClick={()=>patch({difficulties:on?params.difficulties.filter(x=>x!==d):[...params.difficulties,d]})}>{t(`examBuilder.difficultyOptions.${d}`)}</Button>;})}</div></div>;
}

export function StepContent({content,onContent,params,patch,av,areaName,toggleArea,topics,preset,onPreset,matrixCount}:{content:Content;onContent:(c:Content)=>void;params:ExamBuilderParams;patch:Patch;av:ExamAvailability|null;areaName:(id:string|null)=>string;toggleArea:(id:string,on:boolean)=>void;topics:Opt[];preset:PresetId|null;onPreset:(id:PresetId)=>void;matrixCount:number}){
  const showAreas=content==='area'||content==='custom',showTopics=content==='topic'||content==='custom';
  const chosen=params.areaIds;
  return <div className="flex flex-col gap-5">
    <div role="group" aria-label={t('examBuilder.contentLabel')} className="grid gap-3 sm:grid-cols-2">
      {contents.map(c=><ChoiceRow key={c} indicator="radio" size="lg" selected={content===c} onSelect={()=>onContent(c)} title={t(`examBuilder.contentChoices.${c}.title`)} description={t(`examBuilder.contentChoices.${c}.description`)}/>)}
    </div>
    {matrixCount?<Alert tone="steady" role="status" title={t('examBuilder.matrixKept',{n:matrixCount})}>
      <p className="m-0">{t('examBuilder.topicsFromMap')}</p><div><Button size="sm" variant="secondary" onClick={()=>patch({matrixItemIds:[]})}>{t('examBuilder.matrixClear')}</Button></div></Alert>:null}
    {content==='mode'?<div className="flex flex-col gap-3">
      <div role="group" aria-label={t('examBuilder.presetsLabel')} className="grid gap-3 sm:grid-cols-2">
        {presetIds.map(id=><ChoiceRow key={id} indicator="radio" size="lg" selected={preset===id} onSelect={()=>onPreset(id)} title={t(`examBuilder.presets.${id}.title`)} description={t(`examBuilder.presets.${id}.description`)} badge={id==='enamed'?t('examBuilder.presets.enamed.tag'):undefined}/>)}
      </div>
      {preset==='enamed'?<p className="m-0 text-sm text-muted">{t('examBuilder.enamedNote')}</p>:null}
    </div>:null}
    {showAreas||showTopics?<Card><div className="flex flex-col gap-5">
      {showAreas?<fieldset className="m-0 flex flex-col gap-1 border-0 p-0"><legend className="mb-1 text-[15px] font-bold">{t('examBuilder.areas')}</legend>
        {(av?.areas??[]).filter(a=>a.areaId!==null).map(a=>{const id=a.areaId as string;return <Checkbox key={id} checked={chosen.length===0||chosen.includes(id)} onCheckedChange={on=>toggleArea(id,on===true)}
          label={`${areaName(id)} · ${a.available===1?t('examBuilder.areaAvailableOne'):t('examBuilder.areaAvailable',{n:a.available})}`}/>;})}
      </fieldset>:null}
      {showTopics?<Combobox label={t('examBuilder.topics')} placeholder={t('examBuilder.topicsPlaceholder')} options={topics.map(x=>({value:x.id,label:x.name}))} value={params.topicIds} onValueChange={v=>patch({topicIds:v})}
        max={EXAM_BUILDER_LIMITS.maxTopics} maxMessage={t('examBuilder.topicsMax')} emptyLabel={t('examBuilder.topicsEmpty')} removeChipAriaLabel={name=>t('examBuilder.topicRemove',{name})}/>:null}
      {content==='custom'?<div className="grid gap-5 sm:grid-cols-2"><DifficultyField params={params} patch={patch}/>
        <Select label={t('examBuilder.progress')} value={params.progress} onValueChange={v=>patch({progress:v as ExamBuilderParams['progress']})} options={(['all','unseen','wrong'] as const).map(v=>({value:v,label:t(`examBuilder.progressOptions.${v}`)}))}/></div>:null}
    </div></Card>:null}
  </div>;
}

export function StepFormat({name,onName,params,patch,content}:{name:string;onName:(v:string)=>void;params:ExamBuilderParams;patch:Patch;content:Content}){
  return <Card><div className="flex flex-col gap-5">
    <Input label={t('examBuilder.name')} placeholder={t('examBuilder.namePlaceholder')} value={name} maxLength={80} onChange={e=>onName(e.target.value)}/>
    <div className="flex flex-col gap-2">
      <Input label={t('examBuilder.quantity')} type="number" min={EXAM_BUILDER_LIMITS.minQuestions} max={EXAM_BUILDER_LIMITS.maxQuestions} value={Number.isNaN(params.count)?'':params.count} onChange={e=>patch({count:e.target.value===''?NaN:Number(e.target.value)})}/>
      <div role="group" aria-label={t('examBuilder.quantityShortcuts')} className="flex flex-wrap gap-2">{EXAM_BUILDER_LIMITS.shortcuts.map(n=><Button key={n} size="sm" variant={params.count===n?'primary':'secondary'} aria-pressed={params.count===n} onClick={()=>patch({count:n})}>{t('examBuilder.quantityShortcut',{n})}</Button>)}</div>
    </div>
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
