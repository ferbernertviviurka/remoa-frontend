import type { z } from 'zod';
import type { QuestionListQuery, QuestionSessionConfig, QuestionAnswerInput } from '@remoa/contracts';
import { t } from './labels';
import { api } from '@/lib/api';
import {request,QuestionsApiError} from './request';
export {request,QuestionsApiError} from './request';
export function questionError(error: unknown): string {
  const code = error instanceof QuestionsApiError ? error.code : 'network';
  if (['rate_limited', 'quota_exceeded', 'limit_reached', 'budget_exceeded'].includes(code)) return t('questions.quota');
  if (['conflict', 'revision_conflict', 'stale_revision'].includes(code)) return t('questions.conflict');
  if (['forbidden', 'not_found', 'reference_locked'].includes(code)) return t('questions.forbidden');
  if (['insufficient_questions', 'empty_selection'].includes(code) || (error instanceof QuestionsApiError && error.detail?.startsWith('insufficient_questions'))) return t('questions.insufficient');
  return t(code === 'invalid_response' ? 'questions.invalidResponse' : 'questions.actionError');
}
type Contracts = typeof import('./schema-loaders');
const loadContracts = () => import('./schema-loaders');
export async function catalogRequest<T>(path: string, schema: (contracts: Contracts) => z.ZodType<T, z.ZodTypeDef, unknown>, init?: RequestInit): Promise<T> {
  return request(path, schema(await loadContracts()), init);
}
export type QuestionUserState = z.infer<Contracts['questionUserStateSchema']>;
export const emptyUserState: QuestionUserState = { favorite: false, doubtful: false, annotation: '' };
export const queryString = (filters: Partial<QuestionListQuery> & { groups?: string; topicQuery?: string }) => {
  const query = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => { if (Array.isArray(value)) value.forEach(v => query.append(key, String(v))); else if (value !== undefined && value !== '' && value !== 'all') query.set(key, String(value)); });
  return query.toString();
};
export const listQuestions = (filters: Partial<QuestionListQuery>, signal?: AbortSignal) => catalogRequest(`/v1/questions?${queryString(filters)}`, c => c.questionListResultSchema, { signal });
export const listExams = async (signal?: AbortSignal) => { const [c, {z}] = await Promise.all([loadContracts(), import('zod')]); return request('/v1/exams', z.array(c.examPaperPublicSchema), {signal}); };
export const getExam = async (id: string, signal?: AbortSignal) => { const [c, {z}] = await Promise.all([loadContracts(), import('zod')]); return request(`/v1/exams/${id}`, z.object({paper:c.examPaperPublicSchema,questions:z.array(c.questionPublicSchema)}), {signal}); };
export const listSessions = (signal?: AbortSignal) => catalogRequest('/v1/question-sessions', c => c.questionSessionsListSchema, { signal });
export const getSession = (id: string, signal?: AbortSignal) => catalogRequest(`/v1/question-sessions/${id}`, c => c.questionSessionPublicSchema, { signal });
export const createSession = (config: QuestionSessionConfig, key: string) => catalogRequest('/v1/question-sessions', c => c.questionSessionPublicSchema, { method: 'POST', headers: { 'Idempotency-Key': key }, body: JSON.stringify(config) });
export const saveAnswer = (sessionId: string, itemId: string, input: QuestionAnswerInput) => catalogRequest(`/v1/question-sessions/${sessionId}/items/${itemId}/answer`, c => c.questionAnswerSavedSchema, { method: 'PUT', body: JSON.stringify(input) });
export const getReference = (sessionId: string, itemId: string) => catalogRequest(`/v1/question-sessions/${sessionId}/items/${itemId}/reference`, c => c.questionReferenceAfterAnswerSchema);
export const startSavedDiscursive = (questionId:string) => catalogRequest(`/v1/challenge-ai/bank/${encodeURIComponent(questionId)}/start`, c => c.savedQuestionStartResultSchema,{method:'POST',body:JSON.stringify({})});
export const finishSession = (id: string, key: string) => catalogRequest(`/v1/question-sessions/${id}/finish`, c => c.questionSessionReportSchema, { method: 'POST', headers: { 'Idempotency-Key': key }, body: '{}' });
export const getReport = (id: string) => catalogRequest(`/v1/question-sessions/${id}/report`, c => c.questionSessionReportSchema);
export const getUserState = (id: string) => catalogRequest(`/v1/questions/${id}/user-state`, c => c.questionUserStateSchema);
export const saveUserState = (id: string, input: Partial<QuestionUserState>) => catalogRequest(`/v1/questions/${id}/user-state`, c => c.questionUserStateSchema, { method: 'PUT', body: JSON.stringify(input) });
export async function reportQuestion(id: string, version: number, type: string, description: string): Promise<void> {
  const result = await api<unknown>(`/v1/questions/${id}/reports`, { method: 'POST', body: JSON.stringify({ version, type, description }) });
  if (!result.ok) throw new QuestionsApiError(result.error.code, result.error.message);
}

export const addSessionCardsToReview = async (id: string) => { const {z} = await import('zod'); return request(`/v1/question-sessions/${id}/review`, z.object({cards:z.number().int().nonnegative()}), {method:'POST',body:'{}'}); };

export const listQuestionInstitutions=()=>catalogRequest('/v1/question-institutions',c => c.questionInstitutionListSchema);
export const getSessionRecalculation=(id:string)=>catalogRequest(`/v1/question-sessions/${id}/recalculation`,c => c.questionSessionRecalculationSchema);

export const listQuestionTaxonomy = async (kind: 'area' | 'topic') => { const [c, {z}] = await Promise.all([loadContracts(), import('zod')]); return request(`/v1/challenge-ai/taxonomy?kind=${kind}`, z.array(c.enamedTopicOptionSchema)); };

/** F34 student bank (flag bankStudent). Lists never carry a key; the answer response is the only source of the reference (D-1822). */
const loadBank=()=>import('./bank-schema-loaders');
export const listQuestionFacets=async(filters:Partial<QuestionListQuery>&{groups?:string[];topicQuery?:string},signal?:AbortSignal)=>{const c=await loadBank();return request(`/v1/questions/facets?${queryString({...filters,groups:filters.groups?.join(',')})}`,c.questionFacetsSchema,{signal});};
export const answerQuestion=async(id:string,input:{selectedKey:string;mutationId:string;elapsedMs:number})=>{const c=await loadBank();return request(`/v1/questions/${encodeURIComponent(id)}/answer`,c.questionDrawerAttemptSchema,{method:'POST',body:JSON.stringify(input)});};
export const getLastAttempt=async(id:string,signal?:AbortSignal)=>{const c=await loadBank();return request(`/v1/questions/${encodeURIComponent(id)}/attempt`,c.questionLastAttemptSchema,{signal});};
