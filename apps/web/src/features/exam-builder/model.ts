import {allocateExam,examBuilderParamsSchema,examBuilderPresets,type Allocation,type ExamBuilderParams,type ExamBuilderFilter,type ExamPreviewItem,type ExamAvailability} from '@remoa/contracts';

export type PresetId=keyof typeof examBuilderPresets;
export const presetIds=['enamed','quick','mistakes','blank'] as const satisfies readonly PresetId[];
export const defaultParams=(over:Partial<ExamBuilderParams>={}):ExamBuilderParams=>examBuilderParamsSchema.parse({count:20,mode:'study',...over});
/** Keeps what the preset does not own (source, areas, topics, difficulty, shuffle). */
export const applyPreset=(p:ExamBuilderParams,id:PresetId):ExamBuilderParams=>({...p,...examBuilderPresets[id]});
export const filterOf=(p:ExamBuilderParams):ExamBuilderFilter=>({source:p.source,areaIds:[],topicIds:p.topicIds,matrixItemIds:p.matrixItemIds,difficulties:p.difficulties,progress:p.progress});
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
