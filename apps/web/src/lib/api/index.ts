import { httpErrorBodySchema, type Result } from '@remoa/contracts';
import { createClient } from '@/lib/supabase/client';
import { readResultStream } from './sse';

export const apiBase = () => process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

/**
 * Calls the backend API (`/v1/*`). HTTP errors come back as `{ ok: false, error }`;
 * network failures (offline, API down) throw, so callers like the autosave queue can retry.
 */
export async function apiFetch<T>(path: string, token: string | null, init: RequestInit = {}, onFeedback?: (chunk: string) => void): Promise<Result<T>> {
  const headers = new Headers(init.headers);
  if (token) headers.set('authorization', `Bearer ${token}`);
  if (init.body) headers.set('content-type', 'application/json');
  const res = await fetch(`${apiBase()}${path}`, { ...init, headers, cache: 'no-store' });
  if (res.ok && res.body && (res.headers.get('content-type') ?? '').includes('text/event-stream')) return readResultStream<T>(res.body, onFeedback);
  const body: unknown = await res.json().catch(() => null);
  if (res.ok) return body as Result<T>;
  const parsed = httpErrorBodySchema.safeParse(body);
  return { ok: false, error: parsed.success ? parsed.data.error : { code: 'internal', message: `HTTP ${res.status}` } };
}

/** Browser-side call with the current Supabase session token. */
export async function api<T>(path: string, init?: RequestInit, onFeedback?: (chunk: string) => void): Promise<Result<T>> {
  const { data } = await createClient().auth.getSession();
  return apiFetch<T>(path, data.session?.access_token ?? null, init, onFeedback);
}
