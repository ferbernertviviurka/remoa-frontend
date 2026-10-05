'use server';

import { errorCode } from '../shared/reauth';
import { adminGateCode, adminGet } from '../shared/api';

export type DetailOutcome<T> = { ok: true; data: T } | { ok: false; code: string };

/** GET /v1/admin<path> for a drawer (client → server). Same guard as runAdminAction: the API is the real gate. */
export async function fetchAdminDetail<T>(path: string): Promise<DetailOutcome<T>> {
  if (!/^\/[a-z0-9_/-]+$/i.test(path)) return { ok: false, code: 'not_found' };
  const gate = await adminGateCode();
  if (gate) return { ok: false, code: gate };
  const r = await adminGet<T>(path).catch(() => null); // adminGet throws on 429
  if (!r) return { ok: false, code: 'rate_limited' };
  return r.ok ? { ok: true, data: r.data } : { ok: false, code: errorCode(r.error) };
}
