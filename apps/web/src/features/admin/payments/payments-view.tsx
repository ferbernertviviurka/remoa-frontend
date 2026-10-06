'use client';

import { useEffect, useState } from 'react';
import { formatAuditId, paymentRecordMethods, paymentStatuses, type AdminPaymentDetail, type AdminPaymentPage, type AdminPaymentRow, type PaymentStatus } from '@remoa/contracts';
import { t } from '@remoa/strings/admin';
import {
  AdminHeader, AdminSearch, Button, Checkbox, DataTable, Drawer, DrawerActions, DrawerAuditTrail, DrawerFacts, DrawerTimeline, ExternalLinkButton, FilterGroup, Icon,
  PersonCell, ReasonDialog, StatusPill, SummaryChip, type StatusPillProps,
} from '@remoa/ui';
import { exportAdminCsv, runAdminAction } from '../shared/actions';
import { fetchAdminDetail } from '../list-kit/detail-action';
import { useListParams } from '../list-kit/use-list-params';
import { formatBRL } from '../shared/format';
import { When } from '../shared/when';
import { downloadCsv } from '../list-kit/download';
import { formatDateTime, pageSummary } from './helpers';

const tone: Record<PaymentStatus, NonNullable<StatusPillProps['tone']>> = { paid: 'ok', pending: 'warn', failed: 'bad', refunded: 'muted' };
const statusLabel = (s: PaymentStatus) => t(`admin.overview.paymentStatus.${s}`);
const methodLabel = (m: AdminPaymentRow['method']) => t(`admin.payments.filters.method${m === 'pix' ? 'Pix' : m === 'card' ? 'Card' : 'Credit'}`);
const methodWithCoupon = (r: AdminPaymentRow) => (r.coupon ? `${methodLabel(r.method)} · ${r.coupon}` : methodLabel(r.method));
const person = (u: AdminPaymentRow['user']) => u?.name ?? u?.email ?? t('admin.overview.unknownUser');
const stripeUrl = (id: string) => `https://dashboard.stripe.com/${id.startsWith('in_') ? 'invoices' : 'payments'}/${id}`;

type Query = { status: string; method: string; q: string; page: number };
type Kind = 'resend-receipt' | 'refund' | 'mark-paid';
const dialogKey = { 'resend-receipt': 'resendReceipt', refund: 'refund', 'mark-paid': 'markPaid' } as const;

export function PaymentsView({ data, query }: { data: AdminPaymentPage | null; query: Query }) {
  const url = useListParams();
  const { q, setQ } = url;
  const [openId, setOpenId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AdminPaymentDetail | null>(null);
  const [detailError, setDetailError] = useState(false);
  const [fresh, setFresh] = useState<{ id: string; text: string }[]>([]);
  const [asking, setAsking] = useState<Kind | null>(null);
  const [checked, setChecked] = useState(false);
  const [reauth, setReauth] = useState(false);
  const [exporting, setExporting] = useState(false);

  const loadDetail = async (id: string) => {
    const r = await fetchAdminDetail<AdminPaymentDetail>(`/payments/${id}`);
    setDetail(r.ok ? r.data : null);
    setDetailError(!r.ok);
  };
  useEffect(() => {
    if (!openId) return;
    setDetail(null);
    setDetailError(false);
    void loadDetail(openId);
  }, [openId]);

  const close = () => { setOpenId(null); setFresh([]); };
  const row = data?.items.find((r) => r.id === openId) ?? null;
  const s = data?.summary;
  const filters = { status: query.status || undefined, method: query.method || undefined, q: query.q || undefined };

  const optionsOf = (list: readonly string[], label: (v: string) => string) => [{ value: 'all', label: t('admin.payments.filters.all') }, ...list.map((v) => ({ value: v, label: label(v) }))];

  const kind = asking;
  const k = kind ? dialogKey[kind] : 'refund';
  const confirm = async (reason: string) => {
    if (!openId || !kind) throw new Error('no_payment');
    const r = await runAdminAction(`/payments/${openId}/${kind}`, kind === 'mark-paid' ? { reason, checked: true } : { reason });
    setReauth(!r.ok && r.error.code === 'reauth_required');
    if (!r.ok) throw new Error(r.error.code);
    return { auditId: r.auditId };
  };
  const confirmed = (auditId: string) => {
    if (!kind || !openId) return;
    setFresh((f) => [{ id: auditId, text: t(`admin.payments.trail.${dialogKey[kind]}`) }, ...f]);
    void loadDetail(openId);
    if (kind === 'mark-paid') url.refresh(); // status changes now; a refund stays Pago until the Stripe webhook (FR-16)
  };

  const trail = [...fresh, ...(detail?.audit ?? []).filter((e) => !fresh.some((f) => f.id === formatAuditId(e.id))).map((e) => ({ id: formatAuditId(e.id), text: `${t(`admin.audit.actions.${e.action}`)}${e.reason ? ` · ${e.reason}` : ''}` }))];

  return (
    <>
      <AdminHeader title={t('admin.payments.label')} subtitle={t('admin.payments.subtitle')}>
        <AdminSearch label={t('admin.payments.search.label')} placeholder={t('admin.payments.search.placeholder')} value={q} onValueChange={setQ} />
        <Button variant="secondary" onClick={() => setExporting(true)}>
          <Icon name="download" size={18} />
          {t('admin.payments.export.label')}
        </Button>
      </AdminHeader>

      <div className="flex flex-col gap-[18px] px-10 pb-12 pt-[26px] max-lg:px-4">
        {s ? (
          <div className="flex flex-wrap gap-2.5">
            <SummaryChip tone="brand" value={formatBRL(s.receivedCents)} label={t('admin.payments.summary.received')} />
            <SummaryChip tone="brand" value={s.paid} label={t('admin.payments.summary.paid')} />
            <SummaryChip tone="warn" value={s.pending} label={t('admin.payments.summary.pending')} />
            <SummaryChip tone="bad" value={s.failed} label={t('admin.payments.summary.failed')} />
            <SummaryChip tone="brand" value={s.refunded} label={t('admin.payments.summary.refunded')} />
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-x-[22px] gap-y-2.5">
          <FilterGroup label={t('admin.payments.filters.status')} options={optionsOf(paymentStatuses, (v) => statusLabel(v as PaymentStatus))} value={query.status || 'all'} onValueChange={(v) => url.push({ status: v })} />
          <FilterGroup label={t('admin.payments.filters.method')} options={optionsOf(paymentRecordMethods, (v) => methodLabel(v as AdminPaymentRow['method']))} value={query.method || 'all'} onValueChange={(v) => url.push({ method: v })} />
          {data ? <span className="ml-auto text-[13.5px] text-muted">{t('admin.payments.count', { n: data.total })}</span> : null}
        </div>

        <DataTable
          caption={t('admin.payments.table.ariaLabel')}
          rows={data?.items ?? []}
          rowKey={(r) => r.id}
          status={!data ? 'error' : url.pending ? 'loading' : 'ready'}
          loadingLabel={t('admin.states.loading')}
          emptyText={t('admin.states.empty')}
          errorText={t('admin.payments.states.loadError')}
          retryLabel={t('admin.states.retryError')}
          onRetry={url.refresh}
          onRowSelect={(r) => setOpenId(r.id)}
          selectedKey={openId}
          rowLabel={(r) => t('admin.payments.table.row', { name: person(r.user) })}
          columns={[
            { key: 'tx', header: t('admin.payments.table.columns.transaction'), primary: true, cell: (r) => <PersonCell name={person(r.user)} sub={r.id} /> },
            { key: 'item', header: t('admin.payments.table.columns.item'), cell: (r) => t(`admin.overview.items.${r.item}`) },
            { key: 'method', header: t('admin.payments.table.columns.method'), cell: methodWithCoupon },
            { key: 'status', header: t('admin.payments.table.columns.status'), cell: (r) => <StatusPill size="sm" tone={tone[r.status]}>{statusLabel(r.status)}</StatusPill> },
            { key: 'amount', header: t('admin.payments.table.columns.amount'), cell: (r) => <b className="tabular-nums">{formatBRL(r.amountCents)}</b> },
            { key: 'when', header: t('admin.payments.table.columns.when'), cell: (r) => <span className="text-[13.5px] text-muted" ><When iso={r.createdAt} /></span> },
          ]}
          {...(data ? { pagination: { page: data.page, pageSize: data.pageSize, total: data.total, onPageChange: (p: number) => url.push({ page: String(p) }), summary: pageSummary('admin.payments.pagination.summary', data), navLabel: t('admin.payments.pagination.nav'), prevLabel: t('admin.payments.pagination.prev'), nextLabel: t('admin.payments.pagination.next') } } : {})}
        />
      </div>

      <Drawer
        open={!!openId}
        onOpenChange={(o) => !o && close()}
        title={row ? person(row.user) : (detail ? person(detail.user) : t('admin.payments.drawer.label'))}
        subtitle={detail?.user?.email ?? row?.id ?? ''}
        closeLabel={t('admin.payments.drawer.close')}
        {...((detail ?? row) ? { badge: <StatusPill tone={tone[(detail ?? row)!.status]}>{statusLabel((detail ?? row)!.status)}</StatusPill> } : {})}
        footer={
          detail ? (
            <DrawerActions note={t('admin.payments.drawer.rule')}>
              <Button variant="secondary" onClick={() => setAsking('resend-receipt')}>{t('admin.payments.actions.resendReceipt')}</Button>
              {detail.status === 'paid' ? <Button variant="danger" onClick={() => setAsking('refund')}>{t('admin.payments.actions.refund')}</Button> : null}
              {detail.status === 'pending' ? <Button variant="secondary" onClick={() => { setChecked(false); setAsking('mark-paid'); }}>{t('admin.payments.actions.markPaid')}</Button> : null}
              <ExternalLinkButton href={stripeUrl(detail.id)} newTabLabel={t('admin.payments.drawer.newTab')}>{t('admin.payments.actions.openInStripe')}</ExternalLinkButton>
            </DrawerActions>
          ) : undefined
        }
      >
        {detailError ? <p role="alert" className="m-0 text-review-text">{t('admin.payments.drawer.loadError')}</p> : null}
        {detail ? (
          <>
            <DrawerFacts
              items={[
                { k: t('admin.payments.drawer.id'), v: detail.id },
                { k: t('admin.payments.drawer.item'), v: t(`admin.overview.items.${detail.item}`) },
                { k: t('admin.payments.drawer.method'), v: methodWithCoupon(detail) },
                { k: t('admin.payments.drawer.amount'), v: formatBRL(detail.amountCents) },
                { k: t('admin.payments.drawer.createdAt'), v: formatDateTime(detail.createdAt) },
                ...(detail.refundedAt ? [{ k: t('admin.payments.drawer.refundedAt'), v: formatDateTime(detail.refundedAt) }] : []),
              ]}
            />
            {detail.timeline.length ? <DrawerTimeline title={t('admin.payments.drawer.timeline')} steps={detail.timeline.map((e) => ({ label: t(`admin.payments.events.${e.type}`), when: formatDateTime(e.at), done: true }))} /> : null}
            <section aria-label={t('admin.payments.drawer.stripeIds')} className="flex flex-col gap-2.5">
              <span aria-hidden="true" className="text-xs font-bold uppercase tracking-[0.12em] text-muted">{t('admin.payments.drawer.stripeIds')}</span>
              <DrawerFacts
                items={[
                  { k: t('admin.payments.drawer.customerId'), v: detail.stripeCustomerId ?? t('admin.payments.drawer.none') },
                  { k: t('admin.payments.drawer.subscriptionId'), v: detail.stripeSubscriptionId ?? t('admin.payments.drawer.none') },
                  { k: t('admin.payments.drawer.paymentIntentId'), v: detail.stripePaymentIntent ?? t('admin.payments.drawer.none') },
                  { k: t('admin.payments.drawer.invoiceId'), v: detail.stripeInvoiceId ?? t('admin.payments.drawer.none') },
                ]}
              />
            </section>
            <DrawerAuditTrail title={t('admin.payments.drawer.trail')} entries={trail} />
          </>
        ) : null}
      </Drawer>

      <ReasonDialog
        open={!!kind}
        onOpenChange={(o) => !o && setAsking(null)}
        danger={kind === 'refund'}
        title={t(`admin.payments.dialogs.${k}.title`)}
        summary={k === 'refund' ? t('admin.payments.dialogs.refund.summary', { amount: formatBRL(detail?.amountCents ?? 0) }) : t(`admin.payments.dialogs.${k}.summary`)}
        reasonLabel={t('admin.reason.label')}
        tooShortText={t('admin.reason.error')}
        errorText={reauth ? t('admin.auth.recentAuthDesc') : t('admin.errors.serverError')}
        confirmLabel={t('admin.reason.confirm')}
        cancelLabel={t('admin.reason.cancel')}
        doneLabel={t('admin.payments.export.done')}
        receiptText={(id) => t('admin.reason.registered', { id })}
        onConfirm={confirm}
        onConfirmed={confirmed}
        confirmDisabled={kind === 'mark-paid' && !checked}
      >
        {kind === 'mark-paid' ? <Checkbox label={t('admin.payments.dialogs.markPaid.checked')} checked={checked} onCheckedChange={(c) => setChecked(c === true)} /> : null}
      </ReasonDialog>

      <ReasonDialog
        open={exporting}
        onOpenChange={setExporting}
        title={t('admin.payments.export.title')}
        summary={t('admin.payments.export.summary')}
        reasonLabel={t('admin.reason.label')}
        tooShortText={t('admin.reason.error')}
        errorText={t('admin.errors.serverError')}
        confirmLabel={t('admin.reason.confirm')}
        cancelLabel={t('admin.reason.cancel')}
        doneLabel={t('admin.payments.export.done')}
        receiptText={(id) => t('admin.reason.registered', { id })}
        onConfirm={async (reason) => {
          const r = await exportAdminCsv({ reason, resource: 'payments', filters: Object.fromEntries(Object.entries(filters).filter((e): e is [string, string] => !!e[1])) });
          if (!r.ok) throw new Error(r.error.code);
          downloadCsv(r.data.csv, t('admin.payments.export.file'));
          return { auditId: r.auditId };
        }}
      />
    </>
  );
}
