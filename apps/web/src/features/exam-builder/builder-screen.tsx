'use client';
import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {useRouter} from 'next/navigation';
import {Alert,Button,Card,Checkbox,ChoiceRow,Input,Progress,Segmented,Select,Tag} from '@remoa/ui';
import {EXAM_BUILDER_LIMITS,type ExamAvailability,type ExamBuilderParams,type ExamPreviewItem,type ExamTemplate,type QuestionSessionConfig} from '@remoa/contracts';
import {calendarApi} from '@/features/calendar/api';
import {t} from './labels';
import {errorTag,getAvailability,getPreview,listAreas,listTemplates,revalidate,saveTemplate,startBuilderSession,swapQuestion,QuestionsApiError} from './api';
import {applyPreset,compose,defaultParams,filterOf,idempotencyKey,presetIds,validCount,type PresetId} from './model';
import {PreviewList} from './preview-list';
import {ActiveDialog,ChangedDialog,ConfirmDialog,FieldDialog,type Changed} from './dialogs';

export type BuilderInit={ids:string[];matrixItemIds:string[];source?:'ai';preset?:PresetId};
type Load='loading'|'ready'|'error';
const sources=['catalog','catalog_and_ai','ai'] as const;
const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};

export function BuilderScreen({init}:{init:BuilderInit}){
  const router=useRouter();
  const [params,setParams]=useState<ExamBuilderParams>(()=>{
    const base=defaultParams({matrixItemIds:init.matrixItemIds,...(init.source?{source:'ai' as const}:{}),count:Math.min(200,Math.max(20,init.ids.length))});
    return init.ids.length?{...base,count:init.ids.length}:init.preset?applyPreset(base,init.preset):base;
  });
  const [preset,setPreset]=useState<PresetId|null>(init.preset??(init.ids.length?null:'blank'));
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

  useEffect(()=>{let live=true;listAreas().then(a=>live&&setAreas(new Map(a.map(x=>[x.id,x.name])))).catch(()=>undefined);listTemplates().then(r=>live&&setTemplates(r)).catch(()=>undefined);return()=>{live=false;};},[]);

  // FR-24: availability (never draws). Area choice is applied locally, so it is asked with every area.
  const filterKey=JSON.stringify(filterOf(params));
  useEffect(()=>{
    const ac=new AbortController();setAvState('loading');
    getAvailability(JSON.parse(filterKey),ac.signal).then(r=>{setAv(r);setAvState('ready');}).catch(()=>{if(!ac.signal.aborted)setAvState('error');});
    return()=>ac.abort();
  },[filterKey]);

  // FR-27: preview proposal. Debounced; pinned/excluded read from refs so pinning does not redraw.
  const paramsKey=JSON.stringify(params)+':'+tick;
  useEffect(()=>{
    if(!countOk)return;
    const ac=new AbortController();setPvState('loading');
    const id=setTimeout(()=>{
      const p={...params,count:Math.max(params.count,pinnedRef.current.size)};
      getPreview(p,[...pinnedRef.current],[...excluded.current],undefined,ac.signal).then(r=>{
        setSeed(r.seed);setItems(r.items);setPvState('ready');setSwapMsg(null);
        setPinned(new Set(r.items.filter(i=>i.pinned||pinnedRef.current.has(i.questionId)).map(i=>i.questionId)));
      }).catch(()=>{if(!ac.signal.aborted)setPvState('error');});
    },300);
    return()=>{clearTimeout(id);ac.abort();};
    // eslint-disable-next-line react-hooks/exhaustive-deps -- paramsKey is the serialised params + reshuffle tick
  },[paramsKey,countOk]);

  const alloc=useMemo(()=>av?compose(av,params,items,pinned):null,[av,params,items,pinned]);
  const total=items.length;
  const chosenAreas=params.areaIds;
  const allAreaIds=(av?.areas??[]).flatMap(a=>a.areaId===null?[]:[a.areaId]);
  // [] = every area; never lets the last chosen area be unchecked (an empty selection would mean "all").
  const toggleArea=(id:string,on:boolean)=>{const base=chosenAreas.length?chosenAreas:allAreaIds;const next=on?[...new Set([...base,id])]:base.filter(x=>x!==id);if(!next.length)return;patch({areaIds:next.length===allAreaIds.length?[]:next});};
  const minutes=params.timePerQuestionSec?Math.ceil(total*params.timePerQuestionSec/60):null;
  const hasAi=params.source!=='catalog'||items.some(i=>i.origin==='ai_generated');

  const swap=async(id:string)=>{
    if(!seed)return;setSwapBusy(id);setSwapMsg(null);
    try{const item=await swapQuestion({...params,count:Math.max(total,1)},seed,id,items.map(i=>i.questionId),[...excluded.current]);
      setItems(list=>list.map(i=>i.questionId===id?item:i));setPinned(p=>{const n=new Set(p);n.delete(id);return n;});}
    catch(e){setSwapMsg(errorTag(e,'no_replacement')!==null?t('examBuilder.swapNone'):t('examBuilder.previewError'));}
    finally{setSwapBusy(null);}
  };
  const remove=(id:string)=>{excluded.current.add(id);setItems(l=>l.filter(i=>i.questionId!==id));setPinned(p=>{const n=new Set(p);n.delete(id);return n;});};
  const pin=(id:string)=>setPinned(p=>{const n=new Set(p);if(n.has(id))n.delete(id);else n.add(id);return n;});

  const applyTemplate=(tpl:ExamTemplate)=>{setParams(tpl.params);setName(tpl.name);setTemplateId(tpl.id);setPreset(null);};

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

  return <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-6 py-2 md:px-6">
    <header>
      <p className="mb-3 text-xs font-bold uppercase tracking-[.12em] text-muted">{t('examBuilder.eyebrow')}</p>
      <h1 className="m-0 font-display text-[34px] font-extrabold leading-[1.1] tracking-[-0.03em] md:text-[44px]">{t('examBuilder.title')}</h1>
      <p className="mt-3 text-muted">{t('examBuilder.subtitle')}</p>
    </header>
    {notice?<Alert tone={notice.tone} role="status" title={notice.text}/>:null}
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="flex min-w-0 flex-col gap-6">
        <section aria-label={t('examBuilder.presetsLabel')} className="flex flex-col gap-3">
          <h2 className="m-0 font-display text-xl font-extrabold">{t('examBuilder.presetsLabel')}</h2>
          <div role="group" aria-label={t('examBuilder.presetsLabel')} className="grid gap-3 sm:grid-cols-2">
            {presetIds.map(id=><ChoiceRow key={id} indicator="radio" size="lg" selected={preset===id} onSelect={()=>{setParams(p=>applyPreset(p,id));setPreset(id);setTemplateId(null);}}
              title={t(`examBuilder.presets.${id}.title`)} description={t(`examBuilder.presets.${id}.description`)} badge={id==='enamed'?t('examBuilder.presets.enamed.tag'):undefined}/>)}
          </div>
          {preset==='enamed'?<p className="m-0 text-sm text-muted">{t('examBuilder.enamedNote')}</p>:null}
          {init.matrixItemIds.length?<p className="m-0 text-sm text-muted">{t('examBuilder.topicsFromMap')}</p>:null}
        </section>

        <Card><div className="flex flex-col gap-5">
          <Input label={t('examBuilder.name')} placeholder={t('examBuilder.namePlaceholder')} value={name} maxLength={80} onChange={e=>setName(e.target.value)}/>
          <div className="flex flex-col gap-2"><Select label={t('examBuilder.origin')} value={params.source} onValueChange={v=>patch({source:v as typeof sources[number]})} options={sources.map(s=>({value:s,label:t(`examBuilder.originOptions.${s}`)}))}/>
            <p className="m-0 text-sm text-muted">{t('examBuilder.originAiNote')}</p></div>
          <fieldset className="m-0 flex flex-col gap-1 border-0 p-0"><legend className="mb-1 text-[15px] font-bold">{t('examBuilder.areas')}</legend>
            {(av?.areas??[]).filter(a=>a.areaId!==null).map(a=>{const id=a.areaId as string;return <Checkbox key={id} checked={chosenAreas.length===0||chosenAreas.includes(id)} onCheckedChange={on=>toggleArea(id,on===true)}
              label={`${areaName(id)} · ${a.available===1?t('examBuilder.areaAvailableOne'):t('examBuilder.areaAvailable',{n:a.available})}`}/>;})}
          </fieldset>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="flex flex-col gap-2"><span id="eb-diff" className="text-[15px] font-bold">{t('examBuilder.difficulty')}</span>
              <div role="group" aria-labelledby="eb-diff" className="flex flex-wrap gap-2">{(['easy','medium','hard'] as const).map(d=>{const on=params.difficulties.includes(d);return <Button key={d} size="sm" variant={on?'primary':'secondary'} aria-pressed={on} onClick={()=>patch({difficulties:on?params.difficulties.filter(x=>x!==d):[...params.difficulties,d]})}>{t(`examBuilder.difficultyOptions.${d}`)}</Button>;})}</div></div>
            <Select label={t('examBuilder.progress')} value={params.progress} onValueChange={v=>patch({progress:v as ExamBuilderParams['progress']})} options={(['all','unseen','wrong'] as const).map(v=>({value:v,label:t(`examBuilder.progressOptions.${v}`)}))}/>
          </div>
          <div className="flex flex-col gap-2">
            <Input label={t('examBuilder.quantity')} type="number" min={EXAM_BUILDER_LIMITS.minQuestions} max={EXAM_BUILDER_LIMITS.maxQuestions} value={Number.isNaN(params.count)?'':params.count} onChange={e=>patch({count:e.target.value===''?NaN:Number(e.target.value)})}/>
            <div role="group" aria-label={t('examBuilder.quantityShortcuts')} className="flex flex-wrap gap-2">{EXAM_BUILDER_LIMITS.shortcuts.map(n=><Button key={n} size="sm" variant={params.count===n?'primary':'secondary'} aria-pressed={params.count===n} onClick={()=>patch({count:n})}>{t('examBuilder.quantityShortcut',{n})}</Button>)}</div>
          </div>
          <div className="flex flex-col gap-2"><span id="eb-dist" className="text-[15px] font-bold">{t('examBuilder.distribution')}</span>
            <Segmented aria-label={t('examBuilder.distribution')} value={params.distribution} onValueChange={v=>patch({distribution:v as ExamBuilderParams['distribution']})} options={(['balanced','proportional'] as const).map(v=>({value:v,label:t(`examBuilder.distributionOptions.${v}`)}))}/></div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="flex flex-col gap-2"><span className="text-[15px] font-bold">{t('examBuilder.time')}</span>
              <Segmented aria-label={t('examBuilder.time')} value={String(params.timePerQuestionSec??'none')} onValueChange={v=>patch({timePerQuestionSec:v==='none'?null:(Number(v) as 120|180)})} options={(['none','180','120'] as const).map(v=>({value:v,label:t(`examBuilder.timeOptions.${v}`)}))}/></div>
            <div className="flex flex-col gap-2"><span className="text-[15px] font-bold">{t('examBuilder.mode')}</span>
              <Segmented aria-label={t('examBuilder.mode')} value={params.mode} onValueChange={v=>patch({mode:v as ExamBuilderParams['mode']})} options={(['study','simulation'] as const).map(v=>({value:v,label:t(`examBuilder.modeOptions.${v}`)}))}/></div>
          </div>
          <Checkbox checked={params.shuffle} onCheckedChange={v=>patch({shuffle:v===true})} label={t('examBuilder.shuffle')}/>
        </div></Card>

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
      </div>

      <aside aria-label={t('examBuilder.summary')} className="flex flex-col gap-4 lg:sticky lg:top-6">
        <Card><div className="flex flex-col gap-3">
          <h2 className="m-0 font-display text-xl font-extrabold">{t('examBuilder.summary')}</h2>
          <dl className="m-0 flex flex-col gap-2 text-[15px]">
            {([['summaryQuestions',String(total)],['summaryTime',minutes?t('examBuilder.summaryTimeValue',{n:minutes}):t('examBuilder.summaryTimeNone')],['summaryMode',t(`examBuilder.modeOptions.${params.mode}`)],['summaryOrigin',t(`examBuilder.originOptions.${params.source}`)],['summaryDistribution',t(`examBuilder.distributionOptions.${params.distribution}`)],['summaryOrder',t(params.shuffle?'examBuilder.orderShuffled':'examBuilder.orderFixed')]] as const).map(([k,v])=><div key={k} className="flex justify-between gap-3"><dt className="text-muted">{t(`examBuilder.${k}`)}</dt><dd className="m-0 text-right font-semibold">{v}</dd></div>)}
          </dl>
          <Button disabled={total===0||pvState!=='ready'} onClick={()=>{setStartError(null);setDialog('confirm');}}>{t('examBuilder.start')}</Button>
          {total===0?<p className="m-0 text-sm text-muted">{t('examBuilder.startDisabledHint')}</p>:null}
          <Button variant="secondary" onClick={()=>{setDialogError(null);setDialog('template');}}>{t('examBuilder.saveTemplate')}</Button>
          <Button variant="secondary" onClick={()=>{setDialogError(null);setDialog('calendar');}}>{t('examBuilder.calendar')}</Button>
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
