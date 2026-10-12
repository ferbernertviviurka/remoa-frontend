import type {QuestionAdminOutboxQuery,QuestionHashPrepareInput,QuestionOutboxRecoverInput} from './operations-types';
import {request} from '@/features/questions/request';
const load=()=>import('./operations-schema-loaders');
const search=(query:object)=>{const p=new URLSearchParams();for(const[k,v]of Object.entries(query))if(v!==undefined)p.set(k,String(v));return p;};
/** The idempotencyKey travels in the body (contract); reuse it only to retry the identical payload. */
export async function prepareContentHashes(input:QuestionHashPrepareInput){const c=await load();return request('/v1/admin/questions/content-hash/prepare',c.questionHashPrepareResultSchema,{method:'POST',body:JSON.stringify(c.questionHashPrepareInputSchema.parse(input))});}
export async function listGenerationOutbox(query:Partial<QuestionAdminOutboxQuery>,signal?:AbortSignal){const c=await load();return request(`/v1/admin/questions/generation/outbox?${search(c.questionAdminOutboxQuerySchema.parse(query))}`,c.questionAdminOutboxPageSchema,{signal});}
export async function recoverGenerationOutbox(input:QuestionOutboxRecoverInput){const c=await load();return request('/v1/admin/questions/generation/recover',c.questionOutboxRecoverResultSchema,{method:'POST',body:JSON.stringify(c.questionOutboxRecoverInputSchema.parse(input))});}
export async function getGenerationMetrics(windowHours=24,signal?:AbortSignal){const c=await load();return request(`/v1/admin/questions/generation/metrics?${search(c.questionGenerationMetricsQuerySchema.parse({windowHours}))}`,c.questionGenerationMetricsSchema,{signal});}
