'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { AuditEntry } from '@remoa/contracts';
import { formatAuditId } from '@remoa/contracts';
import { t } from '@remoa/strings/admin';
import {
  AdminHeader, AdminSearch, Button, DataTable, Drawer, DrawerActions, DrawerAuditTrail, DrawerFacts, DrawerTimeline, FilterGroup, ReasonDialog, SummaryChip,
  type DataColumn,
} from '@remoa/ui';
import { runAdminAction } from '../shared/actions';
import { formatCount } from '../shared/format';
import { fetchAdminDetail } from './detail-action';
import { useListParams } from './use-list-params';

export class ActionError extends Error {
  constructor(readonly code: string) {
    super(code);
  }
}

/** One drawer action: the label on the button + the ReasonDialog copy + the POST it runs. */
export type ActionSpec = {
  id: string;
  label: string;
  danger?: boolean;
  title: string;
  summary: string;
  confirmLabel: string;
  /** Text of the audit trail line shown right after the action: "<auditLabel> · <reason>". */
  auditLabel: string;
  /** Runs the action(s); throws ActionError. Returns the audit id to show and any data. */
  run: (reason: string) => Promise<{ auditId: string; data?: unknown }>;
  /** Called once the dialog is closed after a success (e.g. open the read-only map). */
  onDone?: (r: { auditId: string; data?: unknown }) => void;
};

/** POST /v1/admin<path> through runAdminAction; throws ActionError(code) so ReasonDialog shows the error. */
export async function act<T = unknown>(path: string, reason: string, extra: Record<string, unknown> = {}) {
  const r = await runAdminAction<T>(path, { reason, ...extra });
  if (!r.ok) throw new ActionError(r.error.code);
  return { auditId: r.auditId, data: r.data };
}

export const auditLine = (e: AuditEntry, labels: Record<string, string>) => ({
  id: formatAuditId(e.id),
  text: [labels[e.action] ?? e.action, e.result === 'denied' ? t('admin.audit.filters.resultDenied') : e.reason].filter(Boolean).join(' · '),
});

export type DrawerContent = {
  title: string;
  subtitle?: string;
  badge: ReactNode;
  facts: { k: string; v: ReactNode }[];
  steps?: { label: string; when?: string; done?: boolean }[];
  /** Audit entries already stored for the target (from the detail). */
  history?: { id: string; text: string }[];
  actions: ActionSpec[];
};

export type AdminListProps<Row, Detail> = {
  title: string;
  subtitle: string;
  searchPlaceholder: string;
  headerExtra?: ReactNode;
  summary: { value: number; label: string; tone: 'brand' | 'ok' | 'warn' | 'bad' }[];
  filters: { param: string; label: string; options: { value: string; label: string }[] }[];
  columns: DataColumn<Row>[];
  caption: string;
  rows: Row[];
  total: number;
  page: number;
  pageSize: number;
  /** Error code of the list request, or null. `reauth_required` gets its own message. */
  loadError: string | null;
  rowKey: (r: Row) => string;
  rowLabel: (r: Row) => string;
  /** GET path of the detail (relative to /v1/admin), or null when the row has none. */
  detailPath: (r: Row) => string | null;
  drawer: (row: Row, detail: Detail | null) => DrawerContent;
  /** Drawer chrome label (aria). */
  drawerLabel: string;
  /** Extra UI after the table (e.g. the read-only map viewer). */
  children?: ReactNode;
};

type DetailState<D> = { key: string; status: 'loading' | 'ready' | 'error'; data: D | null };

export function AdminList<Row, Detail extends { audit?: AuditEntry[]; timeline?: AuditEntry[] }>(p: AdminListProps<Row, Detail>) {
  const lp = useListParams();
  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<DetailState<Detail>>({ key: '', status: 'loading', data: null });
  const [fresh, setFresh] = useState<Record<string, { id: string; text: string }[]>>({});
  const [action, setAction] = useState<ActionSpec | null>(null);
  const [code, setCode] = useState('');
  const reason = useRef('');
  const done = useRef<{ auditId: string; data?: unknown } | null>(null);

  const row = p.rows.find((r) => p.rowKey(r) === selected) ?? null;
  const path = row ? p.detailPath(row) : null;

  const load = (key: string, at: string | null) => {
    if (!at) return setDetail({ key, status: 'ready', data: null });
    void fetchAdminDetail<Detail>(at).then((r) => setDetail(r.ok ? { key, status: 'ready', data: r.data } : { key, status: 'error', data: null }));
  };
  useEffect(() => {
    if (selected) {
      setDetail({ key: selected, status: 'loading', data: null });
      load(selected, path);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload only when another row opens
  }, [selected]);

  const content = row ? p.drawer(row, detail.key === selected ? detail.data : null) : null;
  const shown = selected ? [...(fresh[selected] ?? []), ...(content?.history ?? [])] : [];
  const trail = shown.filter((e, i) => shown.findIndex((x) => x.id === e.id) === i);

  const errorText =
    code === 'reauth_required' ? t('admin.lists.reasonReauth')
    : code === 'seed_not_reviewed' ? t('admin.lists.reasonSeedNotReviewed')
    : code === 'invalid_state' ? t('admin.lists.reasonConflict')
    : code === 'not_found' ? t('admin.lists.reasonNotFound')
    : t('admin.lists.reasonError');

  const from = (p.page - 1) * p.pageSize + 1;
  return (
    <>
      <AdminHeader title={p.title} subtitle={p.subtitle}>
        <AdminSearch label={t('admin.lists.searchLabel')} placeholder={p.searchPlaceholder} value={lp.q} onValueChange={lp.setQ} />
        {p.headerExtra}
      </AdminHeader>

      <div className="flex flex-col gap-[18px] px-10 pb-14 pt-[26px] max-lg:px-4">
        <div className="flex flex-wrap gap-3">
          {p.summary.map((s) => <SummaryChip key={s.label} value={formatCount(s.value)} label={s.label} tone={s.tone} />)}
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          {p.filters.map((f) => (
            <FilterGroup key={f.param} label={f.label} options={f.options} value={lp.get(f.param)} onValueChange={(v) => lp.push({ [f.param]: v })} />
          ))}
          <span className="ml-auto text-sm text-muted" aria-live="polite">{t('admin.lists.results', { n: p.total })}</span>
        </div>

        <DataTable
          caption={p.caption}
          columns={p.columns}
          rows={p.rows}
          rowKey={p.rowKey}
          rowLabel={p.rowLabel}
          status={lp.pending ? 'loading' : p.loadError ? 'error' : 'ready'}
          loadingLabel={t('admin.lists.loading')}
          emptyText={t('admin.lists.empty')}
          errorText={t(p.loadError === 'reauth_required' ? 'admin.lists.loadReauth' : 'admin.lists.loadError')}
          retryLabel={t('admin.lists.retry')}
          onRetry={lp.refresh}
          onRowSelect={(r) => setSelected(p.rowKey(r))}
          selectedKey={selected}
          pagination={{
            page: p.page,
            pageSize: p.pageSize,
            total: p.total,
            onPageChange: (n) => lp.push({ page: String(n) }),
            summary: t('admin.lists.pageSummary', { from: p.total ? from : 0, to: Math.min(p.total, from + p.rows.length - 1), total: formatCount(p.total) }),
            navLabel: t('admin.lists.pageNav'),
            prevLabel: t('admin.lists.prev'),
            nextLabel: t('admin.lists.next'),
          }}
        />
      </div>

      <Drawer
        open={Boolean(row)}
        onOpenChange={(o) => !o && setSelected(null)}
        title={content?.title ?? ''}
        {...(content?.subtitle ? { subtitle: content.subtitle } : {})}
        badge={content?.badge}
        closeLabel={t('admin.lists.closeDrawer')}
        footer={
          content ? (
            <DrawerActions note={t('admin.lists.drawerRule')}>
              {content.actions.length ? content.actions.map((a) => (
                <Button key={a.id} variant={a.danger ? 'danger' : 'secondary'} size="sm" onClick={() => { setCode(''); setAction(a); }}>{a.label}</Button>
              )) : <span className="text-sm text-muted">{t('admin.lists.drawerNoActions')}</span>}
            </DrawerActions>
          ) : null
        }
      >
        {content ? (
          <>
            <DrawerFacts items={content.facts} />
            {content.steps?.length ? <DrawerTimeline title={t('admin.users.drawer.timeline')} steps={content.steps} /> : null}
            <DrawerAuditTrail title={t('admin.lists.auditTrail')} entries={trail} />
            {detail.key === selected && detail.status === 'error' ? <p role="alert" className="m-0 text-sm text-review-text">{t('admin.lists.drawerLoadError')}</p> : null}
          </>
        ) : null}
      </Drawer>

      {action ? (
        <ReasonDialog
          open
          onOpenChange={(o) => {
            if (o) return;
            const out = done.current;
            done.current = null;
            setAction(null);
            if (out) action.onDone?.(out);
          }}
          title={action.title}
          summary={action.summary}
          reasonLabel={t('admin.reason.label')}
          tooShortText={t('admin.lists.reasonTooShort')}
          errorText={errorText}
          confirmLabel={action.confirmLabel}
          cancelLabel={t('admin.lists.reasonCancel')}
          doneLabel={t('admin.lists.reasonDone')}
          receiptText={(id) => t('admin.lists.receipt', { id })}
          {...(action.danger ? { danger: true } : {})}
          onConfirm={async (r) => {
            try {
              reason.current = r;
              const out = await action.run(r);
              done.current = out;
              return out;
            } catch (e) {
              setCode(e instanceof ActionError ? e.code : '');
              throw e;
            }
          }}
          onConfirmed={(auditId) => {
            if (selected) setFresh((f) => ({ ...f, [selected]: [{ id: auditId, text: `${action.auditLabel} · ${reason.current.trim()}` }, ...(f[selected] ?? [])] }));
            lp.refresh();
            if (selected) load(selected, path);
          }}
        />
      ) : null}
      {p.children}
    </>
  );
}
