import { httpErrorBodySchema, type AppError, type Result } from '@remoa/contracts';
import { readResultStream } from './sse';

import { apiBase } from './base';

export { apiBase };

/**
 * Calls the backend API (`/v1/*`). HTTP errors come back as `{ ok: false, error }`;
 * network failures (offline, API down) throw, so callers like the autosave queue can retry.
 */
export async function apiFetch<T>(path: string, token: string | null, init: RequestInit = {}, onFeedback?: (chunk: string) => void): Promise<Result<T>> {
  const headers = new Headers(init.headers);
  if (token) headers.set('authorization', `Bearer ${token}`);
  if (init.body) headers.set('content-type', 'application/json');
  const started = Date.now();
  let res: Response;
  try {
    res = await fetch(`${apiBase()}${path}`, { ...init, headers, cache: 'no-store' });
  } catch (e) {
    trace(init.method, path, 0, started, { code: 'internal', message: `network: ${e instanceof Error ? e.message : String(e)}` });
    throw e;
  }
  if (res.ok && res.body && (res.headers.get('content-type') ?? '').includes('text/event-stream')) {
    trace(init.method, path, res.status, started);
    return readResultStream<T>(res.body, onFeedback);
  }
  const body: unknown = await res.json().catch(() => null);
  const parsed = httpErrorBodySchema.safeParse(body);
  const result: Result<T> = res.ok ? (body as Result<T>) : { ok: false, error: parsed.success ? parsed.data.error : { code: 'internal', message: `HTTP ${res.status}` } };
  trace(init.method, path, res.status, started, result.ok ? undefined : result.error);
  return result;
}

export type ApiErrorDetail = { method: string; path: string; status: number; error: AppError };

/**
 * D-583 (dev only): every API call leaves one line. Calls made by the Next server (`serverApi`, Server Actions) never show in the
 * browser's Network tab, so they print in the `pnpm dev` terminal; browser calls print in DevTools and also fire `remoa:api-error`
 * (toasted when NEXT_PUBLIC_API_DEBUG=1, see DevApiToasts). Share/referral tokens are masked like in the API log.
 */
function trace(method = 'GET', path: string, status: number, started: number, error?: AppError) {
  if (process.env.NODE_ENV !== 'development') return;
  const safe = path.replace(/^(\/v1\/public\/(?:shared|referral)\/)[^/?]+/, '$1:token');
  const line = `[api] ${method} ${safe} -> ${status} ${Date.now() - started}ms${error ? ` ${error.code}: ${error.message}` : ''}`;
  // eslint-disable-next-line no-console -- dev-only trace (D-583), NODE_ENV guard above
  (error ? console.warn : console.info)(line);
  if (error && typeof window !== 'undefined') window.dispatchEvent(new CustomEvent<ApiErrorDetail>('remoa:api-error', { detail: { method, path: safe, status, error } }));
}

/**
 * Browser-side call with the current Supabase session token. supabase-js is imported lazily (G11/D-357) so public pages
 * that only use `apiFetch`/`apiBase` (the landing) do not ship ~60 KB gzip of auth client.
 */
export async function api<T>(path: string, init?: RequestInit, onFeedback?: (chunk: string) => void): Promise<Result<T>> {
  const { createClient } = await import('@/lib/supabase/client');
  const { data } = await createClient().auth.getSession();
  return apiFetch<T>(path, data.session?.access_token ?? null, init, onFeedback);
}
