import {z} from 'zod';
import {
  examAvailabilitySchema,examBoardContentSchema,examGenerateProgressSchema,examGenerateResultSchema,examPreviewSchema,examRevalidateResultSchema,examSwapResultSchema,examTemplateListSchema,examTemplateSchema,questionSessionPublicSchema,
  type ExamBuilderFilter,type ExamGenerateInput,type ExamGenerateResult,type ExamBuilderParams,type ExamPreview,type ExamPreviewItem,type ExamRevalidateResult,type QuestionSessionConfig,
} from '@remoa/contracts';
import {api} from '@/lib/api';
import {request,QuestionsApiError} from '../questions/request';

const post=(body:unknown,headers?:Record<string,string>):RequestInit=>({method:'POST',body:JSON.stringify(body),...(headers?{headers}:{})});
/** Areas with names come from the existing taxonomy route (same as the bank filters). */
export const listAreas=()=>request('/v1/challenge-ai/taxonomy?kind=area',z.array(z.object({id:z.string(),name:z.string()}).passthrough()));
export const listTopics=()=>request('/v1/challenge-ai/taxonomy?kind=topic',z.array(z.object({id:z.string(),name:z.string()}).passthrough()));
/** The student's maps (same route as the bank filters). */
export const listBoards=()=>request('/v1/boards',z.array(z.object({id:z.string(),title:z.string()}).passthrough()));
/** Body = the filter part of the params (areaIds [] = every area), never a draw (FR-24). */
export const getAvailability=(filter:ExamBuilderFilter,signal?:AbortSignal)=>request('/v1/exam-builder/availability',examAvailabilitySchema,{...post(filter),signal});
export const getPreview=(params:ExamBuilderParams,pinnedIds:string[],excludedIds:string[],seed?:string,signal?:AbortSignal):Promise<ExamPreview>=>
  request('/v1/exam-builder/preview',examPreviewSchema,{...post({params,pinnedIds,excludedIds,...(seed?{seed}:{})}),signal});
export const swapQuestion=(params:ExamBuilderParams,seed:string,questionId:string,currentIds:string[],excludedIds:string[]):Promise<ExamPreviewItem>=>
  request('/v1/exam-builder/swap',examSwapResultSchema,post({params,seed,questionId,currentIds,excludedIds})).then(r=>r.item);
export const revalidate=(params:ExamBuilderParams,questionIds:string[]):Promise<ExamRevalidateResult>=>request('/v1/exam-builder/revalidate',examRevalidateResultSchema,post({params,questionIds}));
export const listTemplates=()=>request('/v1/exam-templates',examTemplateListSchema);
export const saveTemplate=(name:string,params:ExamBuilderParams)=>request('/v1/exam-templates',examTemplateSchema,post({name,params}));
export const startBuilderSession=(config:QuestionSessionConfig,key:string)=>request('/v1/question-sessions',questionSessionPublicSchema,post(config,{'Idempotency-Key':key}));

/** Backend may send the tag as code or as message ("active_session_exists:<id>"). Returns the suffix ('' when none) or null. */
export function errorTag(e:unknown,name:string):string|null{
  if(!(e instanceof QuestionsApiError))return null;
  for(const s of [e.code,e.detail??'']){if(s===name)return '';if(s.startsWith(`${name}:`))return s.slice(name.length+1);}
  return null;
}
export {QuestionsApiError};

// G29 (D-1882): generate with live progress (SSE) and the map → Conteúdo prefill.
/** Generates (by map, or by theme when boardId is null) and reports `done of total` after each saved chunk. */
export async function generateWithProgress(input:ExamGenerateInput,onProgress:(done:number,total:number)=>void):Promise<ExamGenerateResult>{
  onProgress(0,input.count);
  const r=await api<unknown>('/v1/exam-builder/generate',post(input,{accept:'text/event-stream'}),undefined,p=>{const v=examGenerateProgressSchema.safeParse(p);if(v.success)onProgress(v.data.generated,v.data.requested);});
  if(!r.ok)throw new QuestionsApiError(r.error.code,r.error.message);
  const parsed=examGenerateResultSchema.safeParse(r.data);
  if(!parsed.success)throw new QuestionsApiError('invalid_response');
  return parsed.data;
}
/** Areas and matérias a map covers, to pre-fill the Conteúdo step (empty when the map has no cards). */
export const getBoardContent=(boardId:string)=>request(`/v1/exam-builder/board-content?boardId=${encodeURIComponent(boardId)}`,examBoardContentSchema)
  .then(c=>c.cardCount>0?{areaIds:c.areaIds,topicIds:c.topicIds}:{areaIds:[],topicIds:[]});
