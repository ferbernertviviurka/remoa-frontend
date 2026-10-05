import { notFound } from 'next/navigation';
import type { AdminTicketDetail, AdminTicketPage } from '@remoa/contracts';
import { t } from '@remoa/strings';
import { AdminHeader } from '@remoa/ui';
import { adminGet, requireAdmin } from '@/features/admin/shared/api';
import { InboxView } from '@/features/admin/support/inbox-view';

type Search = { status?: string; q?: string; t?: string };

export default async function Page({ searchParams }: { searchParams: Promise<Search> }) {
  await requireAdmin();
  const sp = await searchParams;
  const query = { status: sp.status ?? '', q: sp.q ?? '', t: sp.t ?? '' };
  const list = await adminGet<AdminTicketPage>('/tickets', { status: query.status, q: query.q, pageSize: 100 });
  // like the mock: the first ticket of the list opens when none is picked
  const pick = query.t || (list.ok ? (list.data.items[0]?.id ?? '') : '');
  const detail = pick ? await adminGet<AdminTicketDetail>(`/tickets/${encodeURIComponent(pick)}`) : null;
  if (!list.ok) {
    if (list.error.code === 'not_found') notFound();
    return <AdminHeader title={t('admin.support.label')} subtitle={t('admin.support.list.loadError')} />;
  }
  return <InboxView page={list.data} ticket={detail?.ok ? detail.data : null} query={{ ...query, t: detail?.ok ? pick : query.t }} />;
}
