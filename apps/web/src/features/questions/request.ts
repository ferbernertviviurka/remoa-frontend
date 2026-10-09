import type {z} from 'zod';
import {api} from '@/lib/api';
export class QuestionsApiError extends Error { constructor(readonly code: string, readonly detail?: string) { super(code); this.name = 'QuestionsApiError'; } }
export async function request<T>(path: string, schema: z.ZodType<T, z.ZodTypeDef, unknown>, init?: RequestInit): Promise<T> {
  const result = await api<unknown>(path, init);
  if (!result.ok) throw new QuestionsApiError(result.error.code, result.error.message);
  const parsed = schema.safeParse(result.data);
  if (!parsed.success) throw new QuestionsApiError('invalid_response');
  return parsed.data;
}
