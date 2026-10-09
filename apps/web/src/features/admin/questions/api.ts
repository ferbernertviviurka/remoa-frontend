import type { z } from 'zod';
import type { QuestionImportInput, ImportCandidateReviewInput, QuestionPublishInput, QuestionReportQueueQuery, QuestionReportResolveInput } from '@remoa/contracts';
import {request as validatedRequest,QuestionsApiError} from '@/features/questions/request';
type Contracts = typeof import('./schema-loaders');
async function request<T>(path:string,schema:(contracts:Contracts)=>z.ZodType<T,z.ZodTypeDef,unknown>,init?:RequestInit):Promise<T>{return validatedRequest(path,schema(await import('./schema-loaders')),init);}
export type SourceInput=z.output<Contracts['questionSourceInputSchema']>;
export type MedicalReviewInput=z.output<Contracts['questionEditorialReviewInputSchema']>;
export const listSources=()=>request('/v1/admin/questions/sources',c => c.questionSourceListSchema);
export const createSource=(input:SourceInput)=>request('/v1/admin/questions/sources',c => c.questionSourceResultSchema,{method:'POST',body:JSON.stringify(input)});
export const updateSource=(id:string,input:SourceInput)=>request(`/v1/admin/questions/sources/${id}`,c => c.questionSourceResultSchema,{method:'PATCH',body:JSON.stringify(input)});
export function uploadDocument(file:File,sourceId:string,kind:'exam'|'answer_key',reason:string){const body=new FormData();body.set('file',file);body.set('sourceId',sourceId);body.set('kind',kind);body.set('reason',reason);return request('/v1/admin/questions/documents',c => c.questionDocumentUploadResultSchema,{method:'POST',body});}
export async function previewDocumentPage(importId:string,documentId:string,page:number,signal?:AbortSignal){const result=await request(`/v1/admin/questions/imports/${importId}/documents/${documentId}/pages/${page}/preview`,c=>c.questionDocumentPagePreviewSchema,{signal});if(result.importId!==importId||result.documentId!==documentId||result.page!==page)throw new QuestionsApiError('validation','invalid_page_preview');return result;}
export const previewDocument=(id:string)=>request(`/v1/admin/questions/documents/${id}/preview`,c => c.questionDocumentPreviewSchema);
export const previewCrop=(importId:string,candidateId:string,index:number)=>request(`/v1/admin/questions/imports/${importId}/candidates/${candidateId}/crops/${index}/preview`,c => c.questionDocumentPreviewSchema);
export const listImports=()=>request('/v1/admin/questions/imports',c => c.questionImportListSchema);
export const createImport=(input:QuestionImportInput,key:string)=>request('/v1/admin/questions/imports',c => c.questionImportCreatedSchema,{method:'POST',headers:{'Idempotency-Key':key},body:JSON.stringify(input)});
export const getImport=(id:string,signal?:AbortSignal)=>request(`/v1/admin/questions/imports/${id}`,c => c.questionImportDetailSchema,{signal});
export const importAction=(id:string,action:'retry'|'cancel',reason:string)=>request(`/v1/admin/questions/imports/${id}/${action}`,c => c.questionImportStatusResultSchema,{method:'POST',body:JSON.stringify({reason})});
export const saveCandidate=(importId:string,id:string,input:ImportCandidateReviewInput)=>request(`/v1/admin/questions/imports/${importId}/candidates/${id}`,c => c.questionCandidateSavedSchema,{method:'PATCH',body:JSON.stringify(input)});
export const catalogMetrics=()=>request('/v1/admin/questions/metrics',c => c.questionCatalogMetricsSchema);
export const editorialQueue=()=>request('/v1/editorial/questions',c => c.questionEditorialQueueSchema);
export const editorialDetail=(id:string)=>request(`/v1/editorial/questions/${id}`,c => c.questionEditorialDetailSchema);
export const medicalReview=(id:string,input:MedicalReviewInput)=>request(`/v1/editorial/questions/${id}/review`,c => c.questionMedicalReviewResultSchema,{method:'POST',body:JSON.stringify(input)});
export const publicationAction=(id:string,action:'publish'|'withdraw',input:QuestionPublishInput)=>request(`/v1/admin/questions/${id}/${action}`,c => c.questionPublicationResultSchema,{method:'POST',body:JSON.stringify(input)});

export const rectifyQuestion=(id:string,input:QuestionPublishInput)=>request(`/v1/admin/questions/${id}/rectify`,c => c.questionRectificationResultSchema,{method:'POST',body:JSON.stringify(input)});

export type DraftUpdateInput=z.output<Contracts['questionDraftUpdateInputSchema']>;
export const saveQuestionDraft=(id:string,input:DraftUpdateInput)=>request(`/v1/admin/questions/${id}`,c => c.questionDraftSavedSchema,{method:'PATCH',body:JSON.stringify(input)});

const reportsPath=(admin:boolean)=>`/v1/${admin?'admin':'editorial'}/questions/reports`;
export const listQuestionReports=(admin:boolean,query:Partial<QuestionReportQueueQuery>)=>{const params=new URLSearchParams();for(const[key,value]of Object.entries(query))if(value!==undefined)params.set(key,String(value));return request(`${reportsPath(admin)}?${params}`,c => c.questionReportQueueSchema);};
export const getQuestionReport=(admin:boolean,id:string)=>request(`${reportsPath(admin)}/${id}`,c => c.questionReportDetailSchema);
export const resolveQuestionReport=(admin:boolean,id:string,input:QuestionReportResolveInput)=>request(`${reportsPath(admin)}/${id}/resolve`,c => c.questionReportResolveResultSchema,{method:'POST',body:JSON.stringify(input)});

export type CandidatePageImageInput=z.output<Contracts['questionCandidatePageImageInputSchema']>;
export const attachCandidatePage=async(importId:string,id:string,input:CandidatePageImageInput)=>{const c=await import('./schema-loaders');return request(`/v1/admin/questions/imports/${importId}/candidates/${id}/page-image`,schemas=>schemas.questionCandidatePageImageResultSchema,{method:'POST',body:JSON.stringify(c.questionCandidatePageImageInputSchema.parse(input))});};

export type CandidateCreateInput=z.output<Contracts['questionCandidateCreateInputSchema']>;
export type CandidateNumberInput=z.output<Contracts['questionCandidateNumberInputSchema']>;
export type ContextResolveInput=z.output<Contracts['questionImportContextResolveInputSchema']>;
export async function createCandidate(importId:string,input:CandidateCreateInput){const c=await import('./schema-loaders');return request(`/v1/admin/questions/imports/${importId}/candidates`,schemas=>schemas.questionImportRecoveryResultSchema,{method:'POST',body:JSON.stringify(c.questionCandidateCreateInputSchema.parse(input))});}
export async function repairCandidateNumber(importId:string,candidateId:string,input:CandidateNumberInput){const c=await import('./schema-loaders');return request(`/v1/admin/questions/imports/${importId}/candidates/${candidateId}/number`,schemas=>schemas.questionImportRecoveryResultSchema,{method:'POST',body:JSON.stringify(c.questionCandidateNumberInputSchema.parse(input))});}
export async function resolveImportContext(importId:string,contextId:string,input:ContextResolveInput){const c=await import('./schema-loaders');return request(`/v1/admin/questions/imports/${importId}/contexts/${contextId}/resolve`,schemas=>schemas.questionImportContextResolvedSchema,{method:'POST',body:JSON.stringify(c.questionImportContextResolveInputSchema.parse(input))});}

export async function getImportParserWarnings(importId:string,signal?:AbortSignal){const result=await request(`/v1/admin/questions/imports/${importId}/parser-warnings`,c=>c.questionParserWarningsSchema,{signal});if(result.importId!==importId)throw new QuestionsApiError('validation','invalid_parser_warnings');return result;}
