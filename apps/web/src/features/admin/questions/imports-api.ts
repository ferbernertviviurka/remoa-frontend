import type {QuestionImportPageQuery,QuestionImportPageResult} from '@remoa/contracts';
import {request} from '@/features/questions/request';
export async function listImportPage(query:Partial<QuestionImportPageQuery>,signal?:AbortSignal):Promise<QuestionImportPageResult>{
 const c=await import('./imports-schema-loaders');const parsed=c.questionImportPageQuerySchema.parse(query);const params=new URLSearchParams();for(const[key,value]of Object.entries(parsed))if(value!==undefined)params.set(key,String(value));
 return request(`/v1/admin/questions/imports/page?${params}`,c.questionImportPageResultSchema,{signal});
}
