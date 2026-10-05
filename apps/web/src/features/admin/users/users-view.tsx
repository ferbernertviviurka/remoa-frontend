'use client';

import type { ReactNode } from 'react';
import type { AdminUserDetail, AdminUserPage, AdminUserRow } from '@remoa/contracts';
import { strings, t } from '@remoa/strings';
import { PersonCell, StatusPill, type StatusPillProps } from '@remoa/ui';
import { When } from '../shared/when';
import { act, AdminList, auditLine, type ActionSpec } from '../list-kit/admin-list';
import { formatDay } from '../list-kit/download';
import { ExportCsv } from '../list-kit/export-csv';

const tone: Record<AdminUserRow['status'], NonNullable<StatusPillProps['tone']>> = { active: 'muted', pending: 'warn', suspended: 'bad', deleting: 'bad' };
const labels = strings.admin.users.auditActions;
const opt = (v: string, label: string) => ({ value: v, label });
const planOf = (u: AdminUserRow) => t(`admin.users.plan.${u.grantUntil ? 'proGrant' : u.plan}`);

function actionsOf(u: AdminUserRow): ActionSpec[] {
  const name = u.name ?? u.email ?? t('admin.lists.unknownPerson');
  const base = `/users/${u.id}`;
  const spec = (id: string, label: string, key: string, confirm: string, auditLabel: string, vars: Record<string, string>, danger?: boolean): ActionSpec => ({
    id,
    label,
    ...(danger ? { danger } : {}),
    title: t(`admin.users.dialog.${key}Title` as 'admin.users.dialog.grantProTitle'),
    summary: t(`admin.users.dialog.${key}Summary` as 'admin.users.dialog.grantProSummary', vars),
    confirmLabel: confirm,
    auditLabel,
    run: (reason) => act(`${base}/${id}`, reason),
  });
  const list: ActionSpec[] = [];
  if (u.status !== 'suspended' && u.status !== 'deleting') list.push(spec('grant-pro-month', t('admin.users.actions.grantPro'), 'grantPro', t('admin.users.dialog.confirmGrant'), labels['user.grant_pro_month']!, { name }));
  list.push(spec('password-reset', t('admin.users.actions.sendPasswordReset'), 'passwordReset', t('admin.users.dialog.confirmReset'), labels['user.password_reset']!, { email: u.email ?? name }));
  if (u.status === 'suspended') list.push(spec('reactivate', t('admin.users.actions.reactivate'), 'reactivate', t('admin.users.dialog.confirmReactivate'), labels['user.reactivate']!, {}));
  else if (u.status !== 'deleting') list.push(spec('suspend', t('admin.users.actions.suspend'), 'suspend', t('admin.users.dialog.confirmSuspend'), labels['user.suspend']!, {}, true));
  if (u.status !== 'deleting') list.push(spec('schedule-deletion', t('admin.users.actions.scheduleDelete'), 'delete', t('admin.users.dialog.confirmDelete'), labels['user.schedule_deletion']!, {}, true));
  return list;
}

function drawerOf(u: AdminUserRow, d: AdminUserDetail | null) {
  const steps = [{ label: t('admin.users.drawer.stepCreated'), when: formatDay(u.createdAt) }];
  if (d?.emailConfirmedAt) steps.push({ label: t('admin.users.drawer.stepConfirmed'), when: formatDay(d.emailConfirmedAt) });
  if (d?.grantUntil) steps.push({ label: t('admin.users.drawer.stepGrant', { date: formatDay(d.grantUntil) }), when: '' });
  if (d?.suspendedAt) steps.push({ label: t('admin.users.drawer.stepSuspended'), when: formatDay(d.suspendedAt) });
  if (d?.deletionAt) steps.push({ label: t('admin.users.drawer.stepDeletion', { date: formatDay(d.deletionAt) }), when: '' });
  const facts: { k: string; v: ReactNode }[] = [
    { k: t('admin.users.drawer.id'), v: u.id.slice(0, 8) },
    { k: t('admin.users.drawer.plan'), v: planOf(u) },
    { k: t('admin.users.drawer.maps'), v: u.maps },
    { k: t('admin.users.drawer.cards'), v: u.cards },
    { k: t('admin.users.drawer.origin'), v: t(`admin.users.origin.${u.origin}`) },
    { k: t('admin.users.drawer.createdAt'), v: formatDay(u.createdAt) },
  ];
  if (d) {
    facts.push({ k: t('admin.users.drawer.lastSignIn'), v: d.lastSignInAt ? <When iso={d.lastSignInAt} /> : '—' }, { k: t('admin.users.drawer.role'), v: t(`admin.users.role.${d.role}`) });
    if (d.suspendedReason) facts.push({ k: t('admin.users.drawer.suspendedReason'), v: d.suspendedReason });
  }
  return {
    title: u.name ?? u.email ?? t('admin.lists.unknownPerson'),
    ...(u.email ? { subtitle: u.email } : {}),
    badge: <StatusPill size="sm" tone={tone[u.status]}>{t(`admin.users.status.${u.status}`)}</StatusPill>,
    facts,
    steps,
    history: (d?.timeline ?? []).map((e) => auditLine(e, labels)),
    actions: actionsOf(u),
  };
}

type Props = { data: AdminUserPage | null; error: string | null; page: number };

export function UsersView({ data, error, page }: Props) {
  const s = data?.summary;
  return (
    <>
      <AdminList<AdminUserRow, AdminUserDetail>
        title={t('admin.users.label')}
        subtitle={t('admin.users.subtitle')}
        searchPlaceholder={t('admin.users.search.placeholder')}
        headerExtra={
<ExportCsv resource="users" keys={['q', 'plan', 'status']} file="usuarios.csv" />}
        summary={s ? [
          { value: s.total, label: t('admin.users.summary.totalAccounts').toLowerCase(), tone: 'brand' },
          { value: s.active, label: t('admin.users.summary.active').toLowerCase(), tone: 'ok' },
          { value: s.pending, label: t('admin.users.summary.pending').toLowerCase(), tone: 'warn' },
          { value: s.suspended, label: t('admin.users.summary.suspended').toLowerCase(), tone: 'bad' },
        ] : []}
        filters={[
          { param: 'plan', label: t('admin.users.filters.plan'), options: [opt('', t('admin.lists.all')), opt('free', t('admin.users.filters.planFree')), opt('pro', t('admin.users.filters.planPro')), opt('founder', t('admin.users.filters.planFounder')), opt('pro_grant', t('admin.users.filters.planProGrant'))] },
          { param: 'status', label: t('admin.users.filters.status'), options: [opt('', t('admin.lists.all')), opt('active', t('admin.users.filters.statusActive')), opt('pending', t('admin.users.filters.statusPending')), opt('suspended', t('admin.users.filters.statusSuspended'))] },
        ]}
        caption={t('admin.users.table.ariaLabel')}
        columns={[
          { key: 'user', header: t('admin.users.table.columns.user'), primary: true, cell: (u) => <PersonCell name={u.name ?? u.email ?? t('admin.lists.unknownPerson')} {...(u.email ? { sub: u.email } : {})} /> },
          { key: 'plan', header: t('admin.users.table.columns.plan'), cell: (u) => planOf(u) },
          { key: 'maps', header: t('admin.users.table.columns.mapsCards'), cell: (u) => <span className="whitespace-nowrap">{t('admin.users.mapsCount', { maps: u.maps, cards: u.cards })}</span> },
          { key: 'status', header: t('admin.users.table.columns.status'), cell: (u) => <StatusPill size="sm" tone={tone[u.status]}>{t(`admin.users.status.${u.status}`)}</StatusPill> },
          { key: 'origin', header: t('admin.users.table.columns.origin'), cell: (u) => <b>{t(`admin.users.origin.${u.origin}`)}</b> },
          { key: 'created', header: t('admin.users.table.columns.created'), cell: (u) => <span className="whitespace-nowrap text-[13.5px] text-muted" ><When iso={u.createdAt} /></span> },
        ]}
        rows={data?.items ?? []}
        total={data?.total ?? 0}
        page={page}
        pageSize={data?.pageSize ?? 25}
        loadError={error}
        rowKey={(u) => u.id}
        rowLabel={(u) => `${t('admin.users.drawer.label')}: ${u.name ?? u.email ?? ''}`}
        detailPath={(u) => `/users/${u.id}`}
        drawerLabel={t('admin.users.drawer.label')}
        drawer={drawerOf}
      />
    </>
  );
}
