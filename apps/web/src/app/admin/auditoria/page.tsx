import { adminActions, auditResults, type AuditPage } from '@remoa/contracts';
import { adminGet, requireAdmin } from '@/features/admin/shared/api';
import { AuditView } from '@/features/admin/audit/audit-view';
import { oneOf, pageOfParam } from '@/features/admin/payments/helpers';

const DAY = 86_400_000;

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const me = await requireAdmin();
  const sp = await searchParams;
  const query = {
    actor: oneOf(sp.actor, ['me', 'system', 'stripe'] as const) ?? '',
    result: oneOf(sp.result, auditResults) ?? '',
    action: oneOf(sp.action, adminActions) ?? '',
    period: oneOf(sp.period, ['1', '7', '30'] as const) ?? '',
    q: (sp.q ?? '').slice(0, 120),
    page: pageOfParam(sp.page),
  };
  const from = query.period ? new Date(Date.now() - Number(query.period) * DAY).toISOString() : undefined;
  const r = await adminGet<AuditPage>('/audit', { page: query.page, q: query.q, result: query.result, action: query.action, actorId: query.actor === 'me' ? me.id : undefined, actorType: query.actor === 'system' || query.actor === 'stripe' ? query.actor : undefined, from });
  return <AuditView data={r.ok ? r.data : null} query={query} meId={me.id} {...(from ? { from } : {})} />;
}
