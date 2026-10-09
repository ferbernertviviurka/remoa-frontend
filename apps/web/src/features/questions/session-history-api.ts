import type {QuestionSessionsPageQuery,QuestionSessionsPageResult} from '@remoa/contracts';
import {request} from './request';
export async function listSessionHistory(query:Partial<QuestionSessionsPageQuery>,signal?:AbortSignal):Promise<QuestionSessionsPageResult>{
 const c=await import('./session-history-loaders');const parsed=c.questionSessionsPageQuerySchema.parse(query);const params=new URLSearchParams();for(const[key,value]of Object.entries(parsed))if(value!==undefined)params.set(key,String(value));
 return request(`/v1/question-sessions/history?${params}`,c.questionSessionsPageResultSchema,{signal});
}
