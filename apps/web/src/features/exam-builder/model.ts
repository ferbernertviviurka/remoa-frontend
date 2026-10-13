import {allocateExam,EXAM_GENERATE_MAX,examBuilderParamsSchema,examBuilderPresets,type Allocation,type ExamBuilderParams,type ExamBuilderFilter,type ExamPreviewItem,type ExamAvailability} from '@remoa/contracts';

export type PresetId=keyof typeof examBuilderPresets;
export const presetIds=['enamed','quick','mistakes','blank'] as const satisfies readonly PresetId[];
export const defaultParams=(over:Partial<ExamBuilderParams>={}):ExamBuilderParams=>examBuilderParamsSchema.parse({count:20,mode:'study',...over});
/** Keeps what the preset does not own (source, areas, topics, difficulty, shuffle). */
export const applyPreset=(p:ExamBuilderParams,id:PresetId):ExamBuilderParams=>({...p,...examBuilderPresets[id]});
export const filterOf=(p:ExamBuilderParams):ExamBuilderFilter=>({source:p.source,areaIds:[],topicIds:p.topicIds,matrixItemIds:p.matrixItemIds,difficulties:p.difficulties,progress:p.progress,boardId:p.boardId});
export const validCount=(n:number)=>Number.isInteger(n)&&n>=1&&n<=200;

/** Client-side allocation (same function as the server): the bars and the shortfall. Never completes from another source. */
export function compose(av:ExamAvailability,p:ExamBuilderParams,items:readonly ExamPreviewItem[],pinned:ReadonlySet<string>):Allocation|null{
  const chosen=p.areaIds.length?p.areaIds:av.areas.filter(a=>a.available>0).map(a=>a.areaId);
  const areas=chosen.map(id=>({areaId:id,available:av.areas.find(a=>a.areaId===id)?.available??0,pinned:items.filter(i=>pinned.has(i.questionId)&&i.areaId===id).length}));
  const pinnedTotal=areas.reduce((s,a)=>s+a.pinned,0);
  try{return allocateExam(areas,Math.max(p.count,pinnedTotal),p.distribution);}catch{return null;}
}

const IDEM='remoa.examBuilder.idem';
/** One key per preview (signature of the exact request) kept in sessionStorage: double click or a second tab reuse it. */
export function idempotencyKey(signature:string):string{
  try{
    const raw=sessionStorage.getItem(IDEM);const saved=raw?JSON.parse(raw) as {sig:string;key:string}:null;
    if(saved?.sig===signature)return saved.key;
    const key=crypto.randomUUID();sessionStorage.setItem(IDEM,JSON.stringify({sig:signature,key}));return key;
  }catch{return crypto.randomUUID();}
}

// D-1846 wizard: where the questions come from (maps onto params.source) and how the student filters them.
export type Origin='catalog'|'map'|'mixed';
export type Content='area'|'topic'|'mode'|'custom';
export type GenDifficulty='mixed'|'easy'|'medium'|'hard';
/** use = questions the AI already made from the map; gen = ask the AI for new ones (explicit button in the last step). */
export type Ai={use:boolean;gen:boolean;count:number;difficulty:GenDifficulty};
export const defaultAi:Ai={use:true,gen:false,count:10,difficulty:'mixed'};
export const originOf=(s:ExamBuilderParams['source']):Origin=>s==='catalog'?'catalog':s==='ai'?'map':'mixed';
export const sourceOf=(o:Origin):ExamBuilderParams['source']=>o==='catalog'?'catalog':o==='map'?'ai':'catalog_and_ai';
export const needsGenerate=(o:Origin,ai:Ai)=>o==='mixed'||(o==='map'&&ai.gen);
export const validGen=(n:number)=>Number.isInteger(n)&&n>=1&&n<=EXAM_GENERATE_MAX;
export type Stage={origin:Origin;ai:Ai;content:Content;params:ExamBuilderParams};
/** Blocks Continuar: returns the `examBuilder.errors.*` key, or null when the step is complete. */
export function stepError(step:number,s:Stage):'needMap'|'needChoice'|'needGen'|'needTopics'|'needCount'|null{
  if(step===0&&s.origin!=='catalog'){
    if(!s.params.boardId)return 'needMap';
    if(s.origin==='map'&&!s.ai.use&&!s.ai.gen)return 'needChoice';
    if(needsGenerate(s.origin,s.ai)&&!validGen(s.ai.count))return 'needGen';
  }
  if(step===1&&s.content==='topic'&&!s.params.topicIds.length)return 'needTopics';
  if(step===2&&!validCount(s.params.count))return 'needCount';
  return null;
}
