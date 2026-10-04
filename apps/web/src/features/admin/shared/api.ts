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
export const adminGet = <T>(path: string, params?: Record<string, string | number | undefined>): Promise<Result<T>> => serverApi<T>(`/v1/admin${path}${qs(params)}`);

/** POST /v1/admin/<path> with a JSON body (actions carry `{ reason }`). Prefer `runAdminAction` from the client. */
export const adminPost = <T>(path: string, body: unknown): Promise<Result<T>> => serverApi<T>(`/v1/admin${path}`, { method: 'POST', body: JSON.stringify(body) });

/** GET /v1/admin/me, once per request. Anything but ok (not admin, session expired, API down) means "not an admin". */
export const getAdminMe = cache(async (): Promise<AdminMe | null> => {
  const r = mocked() ? await adminMocks.getAdminMe() : await serverApi<AdminMe>('/v1/admin/me').catch(() => null);
  return r?.ok ? r.data : null;
});

/** CLAUDE.md rule 9: non-admin gets 404, never 403. Call first in every /admin page and layout. */
export async function requireAdmin(): Promise<AdminMe> {
  const me = await getAdminMe();
  if (!me) notFound();
  return me;
}

export const getAdminOverview = (period: OverviewPeriod): Promise<Result<AdminOverview>> =>
  mocked() ? adminMocks.getAdminOverview('', period) : adminGet<AdminOverview>('/overview', { period });
