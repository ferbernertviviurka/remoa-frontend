import {allocateExam,EXAM_GENERATE_MAX,starterTemplates,type HealthCourseCode,type StarterTemplate,examBuilderParamsSchema,examBuilderPresets,type Allocation,type ExamBuilderParams,type ExamBuilderFilter,type ExamPreviewItem,type ExamAvailability} from '@remoa/contracts';

/** F35 FR-33: contracts' examBuilderPresets has no full_40, so it is defined here (same fields). */
const presetDefs={...examBuilderPresets,full_40:{count:40,distribution:'balanced',mode:'simulation',timePerQuestionSec:180,progress:'all'}} as const;
export type PresetId=StarterTemplate&keyof typeof presetDefs;
/** Every id the URL (?preset=) may name. */
export const presetIds=['enamed','full_40','quick','mistakes','blank'] as const satisfies readonly PresetId[];
/** Medicine (null = legacy) keeps "Formato ENAMED"; every other course gets "Simulado completo (40)". `fromProfile` = capabilities.starterTemplates, valid only for the profile's own course. */
export function presetIdsFor(course:HealthCourseCode|null,fromProfile?:readonly StarterTemplate[]):PresetId[]{
  if(fromProfile)return fromProfile.filter((x):x is PresetId=>starterTemplates.includes(x));
  return [!course||course==='medicine'?'enamed':'full_40','quick','mistakes','blank'];
}
export const defaultParams=(over:Partial<ExamBuilderParams>={}):ExamBuilderParams=>examBuilderParamsSchema.parse({count:20,mode:'study',...over});
/** Keeps what the preset does not own (source, areas, topics, difficulty, shuffle). */
export const applyPreset=(p:ExamBuilderParams,id:PresetId):ExamBuilderParams=>({...p,...presetDefs[id]});
export const filterOf=(p:ExamBuilderParams):ExamBuilderFilter=>({source:p.source,areaIds:[],topicIds:p.topicIds,matrixItemIds:p.matrixItemIds,difficulties:p.difficulties,progress:p.progress,boardId:p.boardId,course:p.course,...(p.classificationStatus?{classificationStatus:p.classificationStatus}:{})});
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

// D-1846 wizard, reordered in G29: Prova (name, optional map, count) → Origem → Conteúdo → Formato → Revisar.
export const stepIds=['exam','origin','content','format','review'] as const;
export type StepId=(typeof stepIds)[number];
export type Origin='catalog'|'ai'|'mixed';
export type Content='area'|'topic'|'mode'|'custom';
export type GenDifficulty='mixed'|'easy'|'medium'|'hard';
/** use = questions the AI already made from the map; gen = ask the AI for new ones (explicit button in the last step). Without a map the AI always generates (by theme). */
export type Ai={use:boolean;gen:boolean;count:number;difficulty:GenDifficulty};
export const defaultAi:Ai={use:true,gen:false,count:10,difficulty:'mixed'};
export const originOf=(s:ExamBuilderParams['source']):Origin=>s==='catalog'?'catalog':s==='ai'?'ai':'mixed';
export const sourceOf=(o:Origin):ExamBuilderParams['source']=>o==='catalog'?'catalog':o==='ai'?'ai':'catalog_and_ai';
export const needsGenerate=(o:Origin,ai:Ai,board:string|null)=>o==='mixed'||(o==='ai'&&(ai.gen||!board));
/** AI-only: the AI makes the whole exam (capped per request); mixed: the student says how many new ones. */
export const genCountOf=(o:Origin,ai:Ai,count:number)=>o==='ai'?Math.min(validCount(count)?count:1,EXAM_GENERATE_MAX):ai.count;
export const validGen=(n:number)=>Number.isInteger(n)&&n>=1&&n<=EXAM_GENERATE_MAX;
export type Stage={origin:Origin;ai:Ai;content:Content;params:ExamBuilderParams;board:string|null;theme?:string};
/** Blocks Continuar: returns the `examBuilder.errors.*` key, or null when the step is complete. */
export function stepError(step:StepId,s:Stage):'needChoice'|'needGen'|'needTheme'|'needTopics'|'needCount'|null{
  if(step==='exam'&&!validCount(s.params.count))return 'needCount';
  if(step==='origin'){
    if(s.origin==='ai'&&s.board&&!s.ai.use&&!s.ai.gen)return 'needChoice';
    if(s.origin==='mixed'&&!validGen(s.ai.count))return 'needGen';
  }
  if(step==='content'){
    // Without a map the AI needs a theme to write about.
    if(needsGenerate(s.origin,s.ai,s.board)&&!s.board&&!s.params.areaIds.length&&!s.params.topicIds.length&&!s.theme?.trim())return 'needTheme';
    if(s.content==='topic'&&!s.params.topicIds.length&&!s.params.classificationStatus&&(s.origin==='catalog'||!s.params.course))return 'needTopics';
  }
  return null;
}
