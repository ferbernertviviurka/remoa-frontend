import { notFound } from 'next/navigation';
import type { Result } from '@remoa/contracts';
import { adminGet } from '../shared/api';

/** Dev/e2e only, same switch as shared/api.ts. */
export const mocked = () => process.env.ADMIN_MOCKS === '1' && process.env.NODE_ENV !== 'production';

export type ListSearch = Record<string, string | string[] | undefined>;

/** First value of each URL param; empty strings dropped. */
export function flat(sp: ListSearch): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(sp)) {
    const x = Array.isArray(v) ? v[0] : v;
    if (x) out[k] = x;
  }
  return out;
}

export const pageNumber = (v: string | undefined) => Math.max(1, Number.parseInt(v ?? '1', 10) || 1);

/** `real` = GET /v1/admin<path>; ADMIN_MOCKS=1 swaps in the contracts mock. */
export function adminList<T>(path: string, params: Record<string, string>, mock: () => Promise<Result<T>>): Promise<Result<T>> {
  return mocked() ? mock() : adminGet<T>(path, params);
}

/** Data or the error code; the API's 404 (not an admin) becomes the page's 404. */
export function unwrap<T>(r: Result<T>): { data: T | null; error: string | null } {
  if (r.ok) return { data: r.data, error: null };
  if (r.error.code === 'not_found') notFound();
  return { data: null, error: r.error.code };
}
