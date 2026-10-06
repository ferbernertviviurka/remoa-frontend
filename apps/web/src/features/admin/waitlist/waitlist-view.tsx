'use client';

import type { AdminStoreWaitlistSummary, AdminWaitlistPage, AdminWaitlistRow } from '@remoa/contracts';
import { strings, t } from '@remoa/strings/admin';
import { StatusPill } from '@remoa/ui';
import { AdminList } from '../list-kit/admin-list';
import { formatDay } from '../list-kit/download';
import { When } from '../shared/when';
import { ExportCsv } from '../list-kit/export-csv';

type Props = { data: AdminWaitlistPage | null; error: string | null; page: number; /** G16: contagens da lista de espera da loja (sem e-mails); null = indisponível. */ store?: AdminStoreWaitlistSummary | null };

const segs: Record<string, string> = strings.admin.waitlist.segment;
const seg = (r: AdminWaitlistRow) => (r.segment ? (segs[r.segment] ?? r.segment) : t('admin.waitlist.drawer.none'));
const none = () => t('admin.waitlist.drawer.none');

export function WaitlistView({ data, error, page, store }: Props) {
  return (
    <AdminList<AdminWaitlistRow, { audit?: never }>
      title={t('admin.waitlist.label')}
      subtitle={t('admin.waitlist.subtitle')}
      searchPlaceholder={t('admin.waitlist.search.placeholder')}
      headerExtra={<><ExportCsv resource="waitlist" keys={['q']} file="lista-de-espera.csv" /><ExportCsv resource="store_waitlist" keys={[]} file="lista-de-espera-loja.csv" label={t('admin.waitlist.store.export')} /></>}
      summary={[
        ...(data ? [{ value: data.total, label: t('admin.waitlist.summaryTotal'), tone: 'brand' as const }] : []),
        ...(store
          ? [
              { value: store.total, label: t('admin.waitlist.store.total'), tone: 'ok' as const },
              { value: store.buy, label: t('admin.waitlist.store.buy'), tone: 'ok' as const },
              { value: store.sell, label: t('admin.waitlist.store.sell'), tone: 'ok' as const },
              { value: store.byRole.teacher, label: t('admin.waitlist.store.teacher'), tone: 'ok' as const },
              { value: store.byRole.student_resident, label: t('admin.waitlist.store.student_resident'), tone: 'ok' as const },
              { value: store.byRole.physician, label: t('admin.waitlist.store.physician'), tone: 'ok' as const },
            ]
          : []),
      ]}
      filters={[]}
      caption={t('admin.waitlist.ariaLabel')}
      columns={[
        { key: 'email', header: t('admin.waitlist.columns.email'), primary: true, cell: (r) => <b>{r.email}</b> },
        { key: 'segment', header: t('admin.waitlist.columns.segment'), cell: (r) => seg(r) },
        { key: 'origin', header: t('admin.waitlist.columns.origin'), cell: (r) => r.origin ?? none() },
        { key: 'when', header: t('admin.waitlist.columns.date'), cell: (r) => <span className="whitespace-nowrap text-[13.5px] text-muted"><When iso={r.createdAt} /></span> },
      ]}
      rows={data?.items ?? []}
      total={data?.total ?? 0}
      page={page}
      pageSize={data?.pageSize ?? 25}
      loadError={error}
      rowKey={(r) => r.id}
      rowLabel={(r) => r.email}
      detailPath={() => null}
      drawerLabel={t('admin.waitlist.drawerLabel')}
      drawer={(r) => ({
        title: r.email,
        subtitle: seg(r),
        badge: <StatusPill size="sm" tone="muted">{seg(r)}</StatusPill>,
        facts: [
          { k: t('admin.waitlist.drawer.email'), v: r.email },
          { k: t('admin.waitlist.drawer.segment'), v: seg(r) },
          { k: t('admin.waitlist.drawer.origin'), v: r.origin ?? none() },
          { k: t('admin.waitlist.drawer.variant'), v: r.variant ?? none() },
          { k: t('admin.waitlist.drawer.createdAt'), v: formatDay(r.createdAt) },
        ],
        actions: [],
      })}
    />
  );
}
