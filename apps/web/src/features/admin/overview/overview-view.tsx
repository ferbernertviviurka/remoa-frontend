'use client';

import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { AdminOverview, AdminUserRef, OverviewPeriod } from '@remoa/contracts';
import { t } from '@remoa/strings';
import {
  AdminHeader, AdminSection, AttentionItem, BarChart, Button, DataTable, Icon, PeriodSegmented, PersonCell, ReasonDialog, StatCard, StatusPill,
  type StatusPillProps,
} from '@remoa/ui';
import { exportAdminCsv } from '../shared/actions';
import { When } from '../shared/when';
import { formatBRL, formatCount, formatDelta, formatPct, formatTime } from '../shared/format';

const REFRESH_MS = 60_000;
const tone: Record<AdminOverview['latestPayments'][number]['status'], NonNullable<StatusPillProps['tone']>> = { paid: 'ok', pending: 'warn', failed: 'bad', refunded: 'muted' };
const person = (u: AdminUserRef | null) => <PersonCell name={u?.name ?? u?.email ?? t('admin.overview.unknownUser')} {...(u?.email ? { sub: u.email } : {})} />;
const bars = (spark: number[]) => {
  const last = spark.slice(-12);
  const max = Math.max(1, ...last);
  return last.map((v) => v / max);
};
const viewAll = (href: string, label: string) => (
  <Link href={href} className="flex h-11 items-center gap-1.5 rounded-lg px-1 text-sm font-bold text-primary-deep no-underline">
    {label}
    <Icon name="right" size={16} />
  </Link>
);

export function OverviewView({ data, period }: { data: AdminOverview; period: OverviewPeriod }) {
  const router = useRouter();
  const [, start] = useTransition();
  const [exporting, setExporting] = useState(false);

  // FR-13: numbers refresh every 60 s (pauses while the tab is hidden).
  useEffect(() => {
    const id = setInterval(() => document.visibilityState === 'visible' && router.refresh(), REFRESH_MS);
    return () => clearInterval(id);
  }, [router]);

  const k = data.kpis;
  const cards = [
    { key: 'accounts', label: t('admin.overview.kpis.totalAccounts'), icon: 'users', kpi: k.accounts },
    { key: 'maps', label: t('admin.overview.kpis.totalMaps'), icon: 'maps', kpi: k.maps, spark: 'soft' },
    { key: 'pro', label: t('admin.overview.kpis.proSubscribers'), icon: 'sparkle', kpi: k.proSubscribers },
    { key: 'revenue', label: t('admin.overview.kpis.revenue'), icon: 'store', kpi: k.revenue, money: true },
    { key: 'ref', label: t('admin.overview.kpis.qualifiedReferrals'), icon: 'gift', kpi: k.referralsQualified, spark: 'soft' },
    { key: 'tickets', label: t('admin.overview.kpis.openTickets'), icon: 'lifebuoy', kpi: k.openTickets, warn: true },
  ] as const;

  const a = data.attention;
  const attention = [
    { n: a.referralsInReview, text: t('admin.overview.attention.referralsInReview'), tone: 'warn', href: '/admin/indicacoes?status=in_review' },
    { n: a.paymentsFailed24h, text: t('admin.overview.attention.failedPayments'), tone: 'bad', href: '/admin/transacoes?status=failed' },
    { n: a.ticketsStale, text: t('admin.overview.attention.unansweredTickets'), tone: 'bad', href: '/admin/suporte?stale=1' },
    { n: a.seedsAwaitingReview, text: t('admin.overview.attention.pendingSeeds'), tone: 'info', href: '/admin/mapas?origin=seed' },
  ] as const;
  const open = attention.filter((x) => x.n > 0);

  const when = (iso: Date | string) => <span className="text-[13.5px] text-muted" ><When iso={iso} /></span>;

  return (
    <>
      <AdminHeader title={t('admin.overview.label')} subtitle={t('admin.overview.updated', { time: formatTime(data.generatedAt) })}>
        <PeriodSegmented
          aria-label={t('admin.overview.period.label')}
          options={[
            { value: '7', label: t('admin.overview.period.days7') },
            { value: '30', label: t('admin.overview.period.days30') },
            { value: '90', label: t('admin.overview.period.days90') },
          ]}
          value={String(period)}
          onValueChange={(v) => start(() => router.replace(`/admin?period=${v}`, { scroll: false }))}
        />
        <Button variant="secondary" onClick={() => setExporting(true)} title={t('admin.overview.export.tooltip')}>
          <Icon name="download" size={18} />
          {t('admin.overview.export.label')}
        </Button>
      </AdminHeader>

      <div className="flex flex-col gap-[22px] px-10 pb-14 pt-[26px] max-lg:px-4">
        <div className="grid grid-cols-3 gap-[18px] max-lg:grid-cols-1">
          {cards.map((x, i) => (
            <StatCard
              key={x.key}
              index={i}
              label={x.label}
              icon={x.icon}
              value={'money' in x ? formatBRL(x.kpi.value) : formatCount(x.kpi.value)}
              delta={'warn' in x ? (a.ticketsStale > 0 ? t('admin.overview.kpis.staleBadge', { n: a.ticketsStale }) : undefined) : ('money' in x ? (x.kpi.deltaPct === null ? undefined : formatPct(x.kpi.deltaPct)) : formatDelta(x.kpi.delta))}
              {...('warn' in x ? { tone: 'warn' as const, sparkTone: 'warn' as const } : 'spark' in x ? { sparkTone: x.spark } : {})}
              bars={bars(x.kpi.spark)}
            />
          ))}
        </div>

        <div className="grid grid-cols-[minmax(0,1fr)_400px] items-stretch gap-[22px] max-lg:grid-cols-1">
          <BarChart
            title={t('admin.overview.chart.title')}
            aria-label={t('admin.overview.chart.aria')}
            series={data.growth.map((g) => ({ a: g.accounts, b: g.maps }))}
            legend={[t('admin.overview.chart.newAccounts'), t('admin.overview.chart.newMaps')]}
            startLabel={t('admin.overview.chart.startLabel', { n: period })}
            endLabel={t('admin.overview.chart.endLabel')}
            animationKey={String(period)}
          />
          <AdminSection title={t('admin.overview.attention.label')}>
            <div className="flex flex-col gap-3 px-6 pb-6">
              {open.length ? open.map((x) => <AttentionItem as={Link} key={x.href} count={x.n} text={x.text} tone={x.tone} href={x.href} />) : <p className="m-0 text-muted">{t('admin.overview.attention.none')}</p>}
            </div>
          </AdminSection>
        </div>

        <AdminSection title={t('admin.overview.tables.latestPurchases')} action={viewAll('/admin/transacoes', t('admin.overview.tables.viewAllPurchases'))}>
          <DataTable
            flush
            caption={t('admin.overview.tables.latestPurchases')}
            rows={data.latestPayments}
            rowKey={(r) => r.id}
            emptyText={t('admin.states.empty')}
            columns={[
              { key: 'user', header: t('admin.overview.tables.columns.user'), primary: true, cell: (r) => person(r.user) },
              { key: 'item', header: t('admin.overview.tables.columns.item'), cell: (r) => t(`admin.overview.items.${r.item}`) },
              { key: 'method', header: t('admin.overview.tables.columns.method'), cell: (r) => t(`admin.payments.filters.method${r.method === 'pix' ? 'Pix' : r.method === 'card' ? 'Card' : 'Credit'}`) },
              { key: 'status', header: t('admin.overview.tables.columns.status'), cell: (r) => <StatusPill tone={tone[r.status]}>{t(`admin.overview.paymentStatus.${r.status}`)}</StatusPill> },
              { key: 'amount', header: t('admin.overview.tables.columns.amount'), cell: (r) => <b className="tabular-nums">{formatBRL(r.amountCents)}</b> },
              { key: 'date', header: t('admin.overview.tables.columns.date'), cell: (r) => when(r.createdAt) },
            ]}
          />
        </AdminSection>

        <div className="grid grid-cols-2 items-start gap-[22px] max-lg:grid-cols-1">
          <AdminSection title={t('admin.overview.tables.latestUsers')} action={viewAll('/admin/usuarios', t('admin.overview.tables.viewAll'))}>
            <DataTable
              flush
              caption={t('admin.overview.tables.latestUsers')}
              rows={data.latestUsers}
              rowKey={(r) => r.user.id}
              emptyText={t('admin.states.empty')}
              columns={[
                { key: 'user', header: t('admin.overview.tables.columns.user'), primary: true, cell: (r) => person(r.user) },
                { key: 'plan', header: t('admin.overview.tables.columns.plan'), cell: (r) => t(`admin.overview.plans.${r.plan}`) },
                { key: 'origin', header: t('admin.overview.tables.columns.origin'), cell: (r) => <b>{t(`admin.users.origin.${r.origin}`)}</b> },
                { key: 'date', header: t('admin.overview.tables.columns.date'), cell: (r) => when(r.createdAt) },
              ]}
            />
          </AdminSection>
          <AdminSection title={t('admin.overview.tables.latestMaps')} action={viewAll('/admin/mapas', t('admin.overview.tables.viewAll'))}>
            <DataTable
              flush
              caption={t('admin.overview.tables.latestMaps')}
              rows={data.latestMaps}
              rowKey={(r) => r.id}
              emptyText={t('admin.states.empty')}
              columns={[
                { key: 'title', header: t('admin.overview.tables.columns.map'), primary: true, cell: (r) => <PersonCell avatar={false} name={r.title} sub={t(`boards.area.${r.area}`)} /> },
                { key: 'owner', header: t('admin.overview.tables.columns.owner'), cell: (r) => r.owner?.name ?? r.owner?.email ?? t('admin.overview.unknownUser') },
                { key: 'cards', header: t('admin.overview.tables.columns.cards'), cell: (r) => formatCount(r.cards) },
                { key: 'date', header: t('admin.overview.tables.columns.date'), cell: (r) => when(r.createdAt) },
              ]}
            />
          </AdminSection>
        </div>
      </div>

      <ReasonDialog
        open={exporting}
        onOpenChange={setExporting}
        title={t('admin.overview.export.title')}
        summary={t('admin.overview.export.summary')}
        reasonLabel={t('admin.reason.label')}
        tooShortText={t('admin.reason.error')}
        errorText={t('admin.errors.serverError')}
        confirmLabel={t('admin.reason.confirm')}
        cancelLabel={t('admin.reason.cancel')}
        doneLabel={t('admin.overview.export.done')}
        receiptText={(id) => t('admin.reason.registered', { id })}
        onConfirm={async (reason) => {
          const r = await exportAdminCsv({ reason, resource: 'overview', filters: { period: String(period) } });
          if (!r.ok) throw new Error(r.error.code);
          download(r.data.csv, t('admin.overview.export.file', { period }));
          return { auditId: r.auditId };
        }}
      />
    </>
  );
}

function download(csv: string, name: string) {
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  a.click();
  URL.revokeObjectURL(url);
}
