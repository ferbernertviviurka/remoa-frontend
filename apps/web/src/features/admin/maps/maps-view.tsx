'use client';

import { useState } from 'react';
import type { AdminMapPage, AdminMapRow, AuditEntry } from '@remoa/contracts';
import { strings, t } from '@remoa/strings';
import { PersonCell, StatusPill, type StatusPillProps } from '@remoa/ui';
import { act, ActionError, AdminList, auditLine, type ActionSpec } from '../list-kit/admin-list';
import { formatDay } from '../list-kit/download';
import { ExportCsv } from '../list-kit/export-csv';
import { formatWhen } from '../shared/format';
import { AuditMapViewer } from './audit-map-viewer';

const tone: Record<AdminMapRow['status'], NonNullable<StatusPillProps['tone']>> = { private: 'muted', seed_draft: 'warn', seed_approved: 'info', archived: 'bad' };
const labels = strings.admin.maps.auditActions;
const opt = (v: string, label: string) => ({ value: v, label });
const origins = ['manual', 'import', 'seed_copy', 'link_copy', 'seed'] as const;
const statuses = ['private', 'seed_draft', 'seed_approved', 'archived'] as const;
const statusLabel = (s: AdminMapRow['status']) => t(`admin.maps.status.${s}`);

/** GET /v1/admin/maps/:id: the row plus the audit trail (never card content). */
type MapDetail = AdminMapRow & { updatedAt: Date | string; audit: AuditEntry[] };

type Props = { data: AdminMapPage | null; error: string | null; page: number };

export function MapsView({ data, error, page }: Props) {
  const [open, setOpen] = useState<{ graph: unknown; title: string; auditId: string } | null>(null);

  const actionsOf = (m: AdminMapRow): ActionSpec[] => {
    const one = (id: string, path: string, key: string, label: string, confirm: string, auditLabel: string, danger?: boolean): ActionSpec => ({
      id,
      label,
      ...(danger ? { danger } : {}),
      title: t(`admin.maps.dialog.${key}Title` as 'admin.maps.dialog.openTitle'),
      summary: t(`admin.maps.dialog.${key}Summary` as 'admin.maps.dialog.openSummary'),
      confirmLabel: confirm,
      auditLabel,
      // approving needs the recorded medical review: the API answers invalid_state when it is missing (D-461)
      run: (reason) => act(path, reason).catch((e: unknown) => { throw id === 'approve' && e instanceof ActionError && e.code === 'invalid_state' ? new ActionError('seed_not_reviewed') : e; }),
      ...(id === 'open' ? { onDone: (r: { auditId: string; data?: unknown }) => setOpen({ graph: (r.data as { graph?: unknown } | undefined)?.graph, title: m.title, auditId: r.auditId }) } : {}),
    });
    const list = [one('open', `/maps/${m.id}/open`, 'open', t('admin.maps.actions.viewReadOnly'), t('admin.maps.dialog.openConfirm'), labels['map.open_readonly']!)];
    if (m.status === 'seed_draft') list.push(one('approve', `/seeds/${m.id}/approve`, 'approve', t('admin.maps.actions.approveSeed'), t('admin.maps.dialog.approveConfirm'), labels['seed.approve']!));
    if (m.status === 'seed_approved') list.push(one('unpublish', `/seeds/${m.id}/unpublish`, 'unpublish', t('admin.maps.actions.unpublishSeed'), t('admin.maps.dialog.unpublishConfirm'), labels['seed.unpublish']!, true));
    if (m.status !== 'archived' && m.origin !== 'seed') list.push(one('archive', `/maps/${m.id}/archive`, 'archive', t('admin.maps.actions.archive'), t('admin.maps.dialog.archiveConfirm'), labels['map.archive']!, true));
    return list;
  };

  const owner = (m: AdminMapRow) => m.owner?.name ?? m.owner?.email ?? t('admin.maps.drawer.noOwner');

  return (
    <AdminList<AdminMapRow, MapDetail>
      title={t('admin.maps.label')}
      subtitle={t('admin.maps.subtitle')}
      searchPlaceholder={t('admin.maps.search.placeholder')}
      headerExtra={<ExportCsv resource="maps" keys={['q', 'origin', 'status']} file="mapas.csv" />}
      summary={data ? [
        { value: data.summary.total, label: t('admin.maps.summary.total'), tone: 'brand' },
        { value: data.summary.private, label: t('admin.maps.summary.private'), tone: 'ok' },
        { value: data.summary.seedDraft, label: t('admin.maps.summary.seedDraft'), tone: 'warn' },
        { value: data.summary.seedApproved, label: t('admin.maps.summary.seedApproved'), tone: 'ok' },
      ] : []}
      filters={[
        { param: 'origin', label: t('admin.maps.filters.origin'), options: [opt('', t('admin.lists.all')), ...origins.map((o) => opt(o, t(`admin.maps.filters.origin_${o}`)))] },
        { param: 'status', label: t('admin.maps.filters.status'), options: [opt('', t('admin.lists.all')), ...statuses.map((s) => opt(s, statusLabel(s)))] },
      ]}
      caption={t('admin.maps.table.ariaLabel')}
      columns={[
        { key: 'map', header: t('admin.maps.table.columns.map'), primary: true, cell: (m) => <PersonCell avatar={false} name={m.title} sub={t(`boards.area.${m.area}`)} /> },
        { key: 'owner', header: t('admin.maps.table.columns.owner'), cell: owner },
        { key: 'cards', header: t('admin.maps.table.columns.cardsEdges'), cell: (m) => <span className="whitespace-nowrap">{t('admin.maps.drawer.cardsEdges', { cards: m.cards, edges: m.edges })}</span> },
        { key: 'status', header: t('admin.maps.table.columns.status'), cell: (m) => <StatusPill size="sm" tone={tone[m.status]}>{statusLabel(m.status)}</StatusPill> },
        { key: 'origin', header: t('admin.maps.table.columns.origin'), cell: (m) => <b className="whitespace-nowrap">{t(`admin.maps.filters.origin_${m.origin}`)}</b> },
        { key: 'created', header: t('admin.maps.table.columns.created'), cell: (m) => <span className="whitespace-nowrap text-[13.5px] text-muted" suppressHydrationWarning>{formatWhen(m.createdAt)}</span> },
      ]}
      rows={data?.items ?? []}
      total={data?.total ?? 0}
      page={page}
      pageSize={data?.pageSize ?? 25}
      loadError={error}
      rowKey={(m) => m.id}
      rowLabel={(m) => `${t('admin.maps.drawer.label')}: ${m.title}`}
      detailPath={(m) => `/maps/${m.id}`}
      drawerLabel={t('admin.maps.drawer.label')}
      drawer={(m, d) => ({
        title: m.title,
        subtitle: owner(m),
        badge: <StatusPill size="sm" tone={tone[m.status]}>{statusLabel(m.status)}</StatusPill>,
        facts: [
          { k: t('admin.maps.drawer.id'), v: m.id.slice(0, 8) },
          { k: t('admin.maps.drawer.owner'), v: owner(m) },
          { k: t('admin.maps.drawer.cards'), v: m.cards },
          { k: t('admin.maps.drawer.edges'), v: m.edges },
          { k: t('admin.maps.drawer.origin'), v: t(`admin.maps.filters.origin_${m.origin}`) },
          { k: t('admin.maps.drawer.createdAt'), v: formatDay(m.createdAt) },
          ...(d ? [{ k: t('admin.maps.drawer.updatedAt'), v: formatDay(d.updatedAt) }] : []),
        ],
        history: (d?.audit ?? []).map((e) => auditLine(e, labels)),
        actions: actionsOf(m),
      })}
    >
      {open ? <AuditMapViewer {...open} onClose={() => setOpen(null)} /> : null}
    </AdminList>
  );
}
