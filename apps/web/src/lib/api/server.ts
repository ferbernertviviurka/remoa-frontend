import { cache } from 'react';
import type { Result } from '@remoa/contracts';
import { createClient } from '@/lib/supabase/server';
import { getRequestId } from '@/lib/request-id';
import { apiFetch } from './index';
import { clientIpHeaders } from './client-ip';

/** Server Component / Server Action call with the session token and the request id (P-003). */
export async function serverApi<T>(path: string, init: RequestInit = {}): Promise<Result<T>> {
  // GET sem opções: deduplicado por render (layout + página pedem /v1/boards).
  if (!init.method && !init.body && !init.headers) return getCached(path) as Promise<Result<T>>;
  return call<T>(path, init);
}

const getCached = cache((path: string) => call<unknown>(path, {}));

async function call<T>(path: string, init: RequestInit): Promise<Result<T>> {
  const { data } = await (await createClient()).auth.getSession();
  const headers = new Headers(init.headers);
  headers.set('x-request-id', await getRequestId());
  for (const [k, v] of Object.entries(await clientIpHeaders())) headers.set(k, v); // D-537: rate limits/audit see the browser, not this server
  return apiFetch<T>(path, data.session?.access_token ?? null, { ...init, headers });
}
