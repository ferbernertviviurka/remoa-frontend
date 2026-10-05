import { cache } from 'react';
import { notFound } from 'next/navigation';
import { adminMocks } from '@remoa/contracts/mocks';
import type { AdminMe, AdminOverview, OverviewPeriod, Result } from '@remoa/contracts';
import { serverApi } from '@/lib/api/server';

// Dev/e2e only (never in production): the T3/T4 backend may not be up yet.
const mocked = () => process.env.ADMIN_MOCKS === '1' && process.env.NODE_ENV !== 'production';

const qs = (params?: Record<string, string | number | undefined>) => {
  const entries = Object.entries(params ?? {}).filter((e): e is [string, string | number] => e[1] !== undefined && e[1] !== '');
  return entries.length ? `?${new URLSearchParams(entries.map(([k, v]) => [k, String(v)]))}` : '';
};

/** GET /v1/admin/<path>; session token + x-request-id added by serverApi. Deduplicated per render. */
export const adminGet = <T>(path: string, params?: Record<string, string | number | undefined>): Promise<Result<T>> =>
  serverApi<T>(`/v1/admin${path}${qs(params)}`).then((r) => {
    if (!r.ok && r.error.code === 'rate_limited') throw new Error('rate_limited'); // app/admin/error.tsx: "tente de novo"
    return r;
  });

/** POST /v1/admin/<path> with a JSON body (actions carry `{ reason }`). Prefer `runAdminAction` from the client. */
export const adminPost = <T>(path: string, body: unknown): Promise<Result<T>> => serverApi<T>(`/v1/admin${path}`, { method: 'POST', body: JSON.stringify(body) });

/** Only these API codes mean "not an admin"; anything else (rate_limited, 5xx, network) is transient and must not look like a 404. */
const NOT_ADMIN = new Set(['forbidden', 'not_found', 'unauthorized']);

/** GET /v1/admin/me, once per request. null = not an admin; transient failures throw (error boundary offers a retry). */
export const getAdminMe = cache(async (): Promise<AdminMe | null> => {
  const r = mocked() ? await adminMocks.getAdminMe() : await serverApi<AdminMe>('/v1/admin/me');
  if (r.ok) return r.data;
  if (NOT_ADMIN.has(r.error.code)) return null;
  throw new Error(r.error.code);
});

/** For server actions (client callers can't use an error boundary): null = admin, else the outcome code. */
export const adminGateCode = async (): Promise<'not_found' | 'internal' | null> => {
  try {
    return (await getAdminMe()) ? null : 'not_found';
  } catch {
    return 'internal';
  }
};

/** CLAUDE.md rule 9: non-admin gets 404, never 403. Call first in every /admin page and layout. */
export async function requireAdmin(): Promise<AdminMe> {
  const me = await getAdminMe();
  if (!me) notFound();
  return me;
}

export const getAdminOverview = (period: OverviewPeriod): Promise<Result<AdminOverview>> =>
  mocked() ? adminMocks.getAdminOverview('', period) : adminGet<AdminOverview>('/overview', { period });
