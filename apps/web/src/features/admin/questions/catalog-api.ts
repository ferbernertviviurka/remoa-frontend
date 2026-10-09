import type {QuestionAdminCatalogQuery,QuestionAdminCatalogPage,QuestionHistoryQuery,QuestionVersionHistoryPage,QuestionReviewHistoryPage} from '@remoa/contracts';
import {request,QuestionsApiError} from '@/features/questions/request';
const base=(admin:boolean)=>`/v1/${admin?'admin':'editorial'}/questions`;
const params=(query:Record<string,unknown>)=>{const result=new URLSearchParams();for(const[key,value]of Object.entries(query))if(value!==undefined)result.set(key,String(value));return result;};
export async function listQuestionCatalog(admin:boolean,query:Partial<QuestionAdminCatalogQuery>,signal?:AbortSignal):Promise<QuestionAdminCatalogPage>{
 const c=await import('./catalog-schema-loaders');const parsed=c.questionAdminCatalogQuerySchema.parse(query);const path=`${base(admin)}/catalog?${params(parsed)}`;
 const result=admin?await request(path,c.questionAdminCatalogResultSchema,{signal}):await request(path,c.questionAdminCatalogPageSchema,{signal});
 return{items:result.items,nextCursor:result.nextCursor};
}
export async function getQuestionVersionHistory(admin:boolean,id:string,query:Partial<QuestionHistoryQuery>,signal?:AbortSignal):Promise<QuestionVersionHistoryPage>{
 const c=await import('./catalog-schema-loaders');const parsed=c.questionHistoryQuerySchema.parse(query);const path=`${base(admin)}/${encodeURIComponent(id)}/history?${params(parsed)}`;
 const result=admin?await request(path,c.questionVersionHistoryResultSchema,{signal}):await request(path,c.questionVersionHistoryPageSchema,{signal});
 if(result.questionId!==id||result.items.some(item=>item.canonicalId!==result.canonicalId))throw new QuestionsApiError('invalid_response');
 return{questionId:result.questionId,canonicalId:result.canonicalId,items:result.items,nextCursor:result.nextCursor};
}
export async function getQuestionReviewHistory(admin:boolean,id:string,query:Partial<QuestionHistoryQuery>,signal?:AbortSignal):Promise<QuestionReviewHistoryPage>{
 const c=await import('./catalog-schema-loaders');const parsed=c.questionHistoryQuerySchema.parse(query);const path=`${base(admin)}/${encodeURIComponent(id)}/reviews?${params(parsed)}`;
 const result=admin?await request(path,c.questionReviewHistoryResultSchema,{signal}):await request(path,c.questionReviewHistoryPageSchema,{signal});
 if(result.questionId!==id||result.items.some(item=>item.questionId!==id))throw new QuestionsApiError('invalid_response');
 return{questionId:result.questionId,items:result.items,nextCursor:result.nextCursor};
}
