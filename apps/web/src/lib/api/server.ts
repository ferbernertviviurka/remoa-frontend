import { cache } from 'react';
import { redirect } from 'next/navigation';
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
  const token = data.session?.access_token ?? null;
  const r = await apiFetch<T>(path, token, { ...init, headers });
  // D-565: soft navigations only verify the JWT locally, so a revoked session is caught here, by the API. /entrar runs getUser() in the
  // middleware, which clears the dead cookies (no loop).
  if (token && !r.ok && r.error.code === 'unauthorized') redirect('/entrar');
  return r;
}
