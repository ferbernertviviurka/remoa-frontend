'use client';

import { useState } from 'react';
import { adminActions, formatAuditId, auditResults, type AdminAction, type AuditEntry, type AuditPage } from '@remoa/contracts';
import { t } from '@remoa/strings';
import { AdminHeader, AdminSearch, Button, DataTable, Drawer, DrawerFacts, FilterGroup, Icon, JsonDiff, ReasonDialog, Select, StatusPill, SummaryChip } from '@remoa/ui';
import { exportAdminCsv } from '../shared/actions';
import { formatCount } from '../shared/format';
import { When } from '../shared/when';
import { downloadCsv } from '../list-kit/download';
import { formatDateTime, pageSummary } from '../payments/helpers';
import { useListParams } from '../list-kit/use-list-params';

export type AuditQuery = { actor: string; result: string; action: string; period: string; q: string; page: number };

const actionLabel = (a: AdminAction) => t(`admin.audit.actions.${a}`);
const resultLabel = (r: AuditEntry['result']) => t(r === 'success' ? 'admin.audit.filters.resultSuccess' : 'admin.audit.filters.resultDenied');
const short = (id: string) => (id.length > 14 ? `${id.slice(0, id.includes('-') ? 8 : 14)}…` : id);
const target = (e: AuditEntry) => e.targetLabel ?? e.targetId ?? t('admin.audit.drawer.none');
const targetFull = (e: AuditEntry) => (e.targetType ? `${t(`admin.audit.targets.${e.targetType}`)}${e.targetId ? ` ${short(e.targetId)}` : ''}` : t('admin.audit.drawer.none'));
const who = (e: AuditEntry, meId: string) =>
  e.actorType === 'system' ? t('admin.audit.who.system')
  : e.actorType === 'stripe' ? t('admin.audit.who.stripe')
  : e.actor?.id === meId ? t('admin.audit.who.me')
  : e.actorType === 'user' ? (e.actor?.email ?? t('admin.audit.who.user'))
  : (e.actor?.name ?? e.actor?.email ?? t('admin.audit.who.unknown'));

export function AuditView({ data, query, meId, from }: { data: AuditPage | null; query: AuditQuery; meId: string; from?: string }) {
  const url = useListParams();
  const { q, setQ } = url;
  const [openId, setOpenId] = useState<number | null>(null);
  const [exporting, setExporting] = useState(false);
  const entry = data?.items.find((e) => e.id === openId) ?? null;
  const all = { value: 'all', label: t('admin.audit.filters.all') };

  return (
    <>
      <AdminHeader title={t('admin.audit.label')} subtitle={t('admin.audit.subtitle')}>
        <AdminSearch label={t('admin.audit.search.label')} placeholder={t('admin.audit.search.placeholder')} value={q} onValueChange={setQ} />
        <Button variant="secondary" onClick={() => setExporting(true)}>
          <Icon name="download" size={18} />
          {t('admin.audit.export.label')}
        </Button>
      </AdminHeader>

      <div className="flex flex-col gap-[18px] px-10 pb-12 pt-[26px] max-lg:px-4">
        {data ? (
          <div className="flex flex-wrap gap-2.5">
            <SummaryChip tone="brand" value={formatCount(data.summary.total)} label={t('admin.audit.summary.records')} />
            <SummaryChip tone="brand" value={formatCount(data.summary.admin)} label={t('admin.audit.summary.admins')} />
            <SummaryChip tone="brand" value={formatCount(data.summary.system)} label={t('admin.audit.summary.system')} />
            <SummaryChip tone="warn" value={formatCount(data.summary.denied)} label={t('admin.audit.summary.denied')} />
          </div>
        ) : null}

        <div className="flex flex-wrap items-end gap-x-[22px] gap-y-2.5">
          <FilterGroup label={t('admin.audit.filters.actor')} options={[all, { value: 'me', label: t('admin.audit.filters.actorMe') }, { value: 'system', label: t('admin.audit.filters.actorSystem') }, { value: 'stripe', label: t('admin.audit.filters.actorStripe') }]} value={query.actor || 'all'} onValueChange={(v) => url.push({ actor: v })} />
          <FilterGroup label={t('admin.audit.filters.result')} options={[all, ...auditResults.map((r) => ({ value: r, label: resultLabel(r) }))]} value={query.result || 'all'} onValueChange={(v) => url.push({ result: v })} />
          <FilterGroup label={t('admin.audit.filters.period')} options={[all, { value: '1', label: t('admin.audit.filters.period1') }, { value: '7', label: t('admin.audit.filters.period7') }, { value: '30', label: t('admin.audit.filters.period30') }]} value={query.period || 'all'} onValueChange={(v) => url.push({ period: v })} />
          <div className="w-[260px] max-w-full">
            <Select label={t('admin.audit.filters.action')} options={[{ value: 'all', label: t('admin.audit.filters.allActions') }, ...adminActions.map((a) => ({ value: a, label: actionLabel(a) }))]} value={query.action || 'all'} onValueChange={(v) => url.push({ action: v })} />
          </div>
          {data ? <span className="ml-auto text-[13.5px] text-muted">{t('admin.audit.count', { n: data.total })}</span> : null}
        </div>

        <DataTable
          caption={t('admin.audit.table.ariaLabel')}
          rows={data?.items ?? []}
          rowKey={(e) => String(e.id)}
          status={!data ? 'error' : url.pending ? 'loading' : 'ready'}
          loadingLabel={t('admin.states.loading')}
          emptyText={t('admin.states.empty')}
          errorText={t('admin.audit.states.loadError')}
          retryLabel={t('admin.states.retryError')}
          onRetry={url.refresh}
          onRowSelect={(e) => setOpenId(e.id)}
          selectedKey={openId === null ? null : String(openId)}
          rowLabel={(e) => t('admin.audit.table.row', { id: formatAuditId(e.id) })}
          columns={[
            { key: 'action', header: t('admin.audit.table.columns.action'), primary: true, cell: (e) => <span className="flex flex-col leading-[1.3]"><b>{actionLabel(e.action)}</b><span className="text-[13px] text-muted">{target(e)}</span></span> },
            { key: 'who', header: t('admin.audit.table.columns.who'), cell: (e) => who(e, meId) },
            { key: 'reason', header: t('admin.audit.table.columns.reason'), cell: (e) => <span className="block max-w-[220px] truncate">{e.reason ?? t('admin.audit.noReason')}</span> },
            { key: 'result', header: t('admin.audit.table.columns.result'), cell: (e) => <StatusPill size="sm" tone={e.result === 'success' ? 'info' : 'warn'}>{resultLabel(e.result)}</StatusPill> },
            { key: 'origin', header: t('admin.audit.table.columns.origin'), cell: (e) => <b>{e.ipHash ? t('admin.audit.origin', { hash: e.ipHash.slice(-4) }) : t('admin.audit.noReason')}</b> },
            { key: 'when', header: t('admin.audit.table.columns.when'), cell: (e) => <span className="text-[13.5px] text-muted" ><When iso={e.createdAt} /></span> },
          ]}
          {...(data ? { pagination: { page: data.page, pageSize: data.pageSize, total: data.total, onPageChange: (p: number) => url.push({ page: String(p) }), summary: pageSummary('admin.audit.pagination.summary', data), navLabel: t('admin.audit.pagination.nav'), prevLabel: t('admin.audit.pagination.prev'), nextLabel: t('admin.audit.pagination.next') } } : {})}
        />
      </div>

      <Drawer
        open={!!entry}
        onOpenChange={(o) => !o && setOpenId(null)}
        title={entry ? actionLabel(entry.action) : t('admin.audit.drawer.label')}
        subtitle={entry ? formatAuditId(entry.id) : ''}
        closeLabel={t('admin.audit.drawer.close')}
        {...(entry ? { badge: <StatusPill tone={entry.result === 'success' ? 'info' : 'warn'}>{resultLabel(entry.result)}</StatusPill> } : {})}
      >
        {entry ? (
          <>
            <DrawerFacts
              items={[
                { k: t('admin.audit.drawer.timestamp'), v: formatDateTime(entry.createdAt) },
                { k: t('admin.audit.drawer.actor'), v: who(entry, meId) },
                { k: t('admin.audit.drawer.action'), v: entry.action },
                { k: t('admin.audit.drawer.target'), v: entry.targetLabel ? `${entry.targetLabel} (${targetFull(entry)})` : targetFull(entry) },
                { k: t('admin.audit.drawer.reason'), v: entry.reason ?? t('admin.audit.drawer.none') },
                { k: t('admin.audit.drawer.result'), v: resultLabel(entry.result) },
                ...(entry.denial ? [{ k: t('admin.audit.drawer.denial'), v: t(`admin.audit.denials.${entry.denial}`) }] : []),
                { k: t('admin.audit.drawer.requestId'), v: entry.requestId ?? t('admin.audit.drawer.none') },
                { k: t('admin.audit.drawer.ipHash'), v: entry.ipHash ?? t('admin.audit.drawer.none') },
                { k: t('admin.audit.drawer.userAgent'), v: entry.userAgent ?? t('admin.audit.drawer.none') },
              ]}
            />
            <JsonDiff beforeLabel={t('admin.audit.drawer.before')} afterLabel={t('admin.audit.drawer.after')} before={entry.before} after={entry.after} emptyText={t('admin.audit.drawer.noChange')} />
          </>
        ) : null}
      </Drawer>

      <ReasonDialog
        open={exporting}
        onOpenChange={setExporting}
        title={t('admin.audit.export.title')}
        summary={t('admin.audit.export.summary')}
        reasonLabel={t('admin.reason.label')}
        tooShortText={t('admin.reason.error')}
        errorText={t('admin.errors.serverError')}
        confirmLabel={t('admin.reason.confirm')}
        cancelLabel={t('admin.reason.cancel')}
        doneLabel={t('admin.audit.export.done')}
        receiptText={(id) => t('admin.reason.registered', { id })}
        onConfirm={async (reason) => {
          const f: Record<string, string | undefined> = { actorId: query.actor === 'me' ? meId : undefined, actorType: query.actor === 'system' || query.actor === 'stripe' ? query.actor : undefined, result: query.result || undefined, action: query.action || undefined, from, q: query.q || undefined };
          const r = await exportAdminCsv({ reason, resource: 'audit', filters: Object.fromEntries(Object.entries(f).filter((e): e is [string, string] => !!e[1])) });
          if (!r.ok) throw new Error(r.error.code);
          downloadCsv(r.data.csv, t('admin.audit.export.file'));
          return { auditId: r.auditId };
        }}
      />
    </>
  );
}
