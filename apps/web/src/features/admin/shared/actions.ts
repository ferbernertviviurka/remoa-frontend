'use server';

import type { adminExportResources, AuditEntry } from '@remoa/contracts';
import { formatAuditId } from '@remoa/contracts';
import { createClient } from '@/lib/supabase/server';
import { apiBase } from '@/lib/api';
import { getRequestId } from '@/lib/request-id';
import { adminGateCode, adminPost } from './api';
import { errorCode } from './reauth';

const norm = (e: { code: string; message: string }) => ({ code: errorCode(e), message: e.message });

export type AdminActionOutcome<T> = { ok: true; auditId: string; data: T } | { ok: false; error: { code: string; message: string } };

const safe = (path: string) => /^\/[a-z0-9_/-]+$/i.test(path);
const auditIdOf = (h: string | null) => (h && /^\d+$/.test(h) ? formatAuditId(Number(h)) : (h ?? ''));
const notFoundOutcome = { ok: false, error: { code: 'not_found', message: 'not found' } } as const;

/**
 * Every admin POST from the client goes through here (D-452). `path` is relative to /v1/admin (e.g. `/users/<id>/suspend`).
 * Returns `{ ok, auditId: 'a_1050', data }` or `{ ok: false, error }`; `error.code === 'reauth_required'` (normalized from the API's forbidden + reauth_required, see reauth.ts) means ask the admin to sign in again.
 * The API is the real gate (requireAdmin + withAdmin); the me check only avoids pointless calls.
 */
export async function runAdminAction<T = unknown>(path: string, body: { reason: string } & Record<string, unknown>): Promise<AdminActionOutcome<T>> {
  if (!safe(path)) return notFoundOutcome;
  const gate = await adminGateCode();
  if (gate) return { ok: false, error: { code: gate, message: gate } };
  const r = await adminPost<{ audit: AuditEntry } & T>(path, body);
  if (!r.ok) return { ok: false, error: norm(r.error) };
  const { audit, ...data } = r.data;
  return { ok: true, auditId: formatAuditId(audit.id), data: data as T };
}

/** POST /v1/admin/export → CSV text (the API answers text/csv and puts the audit id in `x-audit-id`). */
export async function exportAdminCsv(input: { reason: string; resource: (typeof adminExportResources)[number]; filters?: Record<string, string> }): Promise<AdminActionOutcome<{ csv: string }>> {
  const gate = await adminGateCode();
  if (gate) return { ok: false, error: { code: gate, message: gate } };
  const { data } = await (await createClient()).auth.getSession();
  const res = await fetch(`${apiBase()}/v1/admin/export`, {
    method: 'POST',
    cache: 'no-store',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${data.session?.access_token ?? ''}`, 'x-request-id': await getRequestId() },
    body: JSON.stringify({ filters: {}, ...input }),
  }).catch(() => null);
  if (!res) return { ok: false, error: { code: 'internal', message: 'network' } };
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { code: string; message: string } } | null;
    return { ok: false, error: body?.error ? norm(body.error) : { code: 'internal', message: `HTTP ${res.status}` } };
  }
  return { ok: true, auditId: auditIdOf(res.headers.get('x-audit-id')), data: { csv: await res.text() } };
}
