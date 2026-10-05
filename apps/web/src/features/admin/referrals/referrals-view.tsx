'use client';

import type { AdminReferralDetail, AdminReferralPage, AdminReferralRow, AdminUserRef } from '@remoa/contracts';
import { strings, t } from '@remoa/strings';
import { PersonCell, StatusPill, type StatusPillProps } from '@remoa/ui';
import { act, AdminList, auditLine, type ActionSpec } from '../list-kit/admin-list';
import { formatDay } from '../list-kit/download';
import { ExportCsv } from '../list-kit/export-csv';
import { When } from '../shared/when';

const tone: Record<AdminReferralRow['status'], NonNullable<StatusPillProps['tone']>> = { invited: 'muted', signed_up: 'warn', qualified: 'ok', in_review: 'warn', rejected: 'bad', expired: 'muted' };
const labels = strings.admin.referrals.auditActions;
const opt = (v: string, label: string) => ({ value: v, label });
const statuses = ['qualified', 'signed_up', 'invited', 'in_review', 'rejected', 'expired'] as const;
const channels = ['link', 'email'] as const;

const who = (u: AdminUserRef | null) => u?.name ?? u?.email ?? t('admin.lists.unknownPerson');
const referee = (r: AdminReferralRow) => (r.referee ? who(r.referee) : (r.invitedEmailMasked ?? t('admin.lists.unknownPerson')));
const signals = (r: AdminReferralRow) => (r.fraudSignals.length ? t('admin.referrals.signalsCount', { n: r.fraudSignals.length }) : t('admin.referrals.signalsNone'));
const reward = (r: AdminReferralRow) => (r.rewardMonths === 2 ? t('admin.referrals.rewardPair') : r.rewardMonths > 0 ? t('admin.referrals.reward', { n: r.rewardMonths }) : t('admin.referrals.drawer.rewardNone'));
const pill = (r: AdminReferralRow) => <StatusPill size="sm" tone={tone[r.status]}>{t(`admin.referrals.filters.status_${r.status}`)}</StatusPill>;

function actionsOf(r: AdminReferralRow, d: AdminReferralDetail | null): ActionSpec[] {
  const spec = (id: string, key: string, label: string, confirm: string, auditLabel: string, run: ActionSpec['run'], danger?: boolean): ActionSpec => ({
    id,
    label,
    ...(danger ? { danger } : {}),
    title: t(`admin.referrals.dialog.${key}Title` as 'admin.referrals.dialog.approveTitle'),
    summary: t(`admin.referrals.dialog.${key}Summary` as 'admin.referrals.dialog.approveSummary', { from: who(r.referrer) }),
    confirmLabel: confirm,
    auditLabel,
    run,
  });
  const list: ActionSpec[] = [];
  const open = r.status === 'signed_up' || r.status === 'in_review';
  if (open) list.push(spec('approve', 'approve', t('admin.referrals.actions.approve'), t('admin.referrals.dialog.approveConfirm'), labels['referral.approve']!, (reason) => act(`/referrals/${r.id}/approve`, reason)));
  if (open || r.status === 'invited') list.push(spec('reject', 'reject', t('admin.referrals.actions.reject'), t('admin.referrals.dialog.rejectConfirm'), labels['referral.reject']!, (reason) => act(`/referrals/${r.id}/reject`, reason), true));
  const active = d?.grants.filter((g) => !g.revokedAt) ?? [];
  if (active.length) {
    list.push(spec('revoke', 'revoke', t('admin.referrals.actions.revoke'), t('admin.referrals.dialog.revokeConfirm'), labels['grant.revoke']!, async (reason) => {
      // one call per grant (the API revokes one at a time); the receipt lists every audit id
      const ids: string[] = [];
      for (const g of active) ids.push((await act(`/referrals/${r.id}/revoke-grant`, reason, { grantId: g.id })).auditId);
      return { auditId: ids.join(' e ') };
    }, true));
  }
  return list;
}

function drawerOf(r: AdminReferralRow, d: AdminReferralDetail | null) {
  const facts = [
    { k: t('admin.referrals.drawer.referrer'), v: who(r.referrer) },
    { k: t('admin.referrals.drawer.referred'), v: referee(r) },
    { k: t('admin.referrals.drawer.channel'), v: t(`admin.referrals.filters.channel_${r.channel}`) },
    { k: t('admin.referrals.drawer.fraudSignals'), v: r.fraudSignals.length ? r.fraudSignals.map((s) => t(`admin.referrals.signal.${s}`)).join(', ') : t('admin.referrals.drawer.none') },
    { k: t('admin.referrals.drawer.reward'), v: reward(r) },
    { k: t('admin.referrals.drawer.createdAt'), v: formatDay(r.createdAt) },
  ];
  if (d?.qualifiedAt) facts.push({ k: t('admin.referrals.drawer.qualifiedAt'), v: formatDay(d.qualifiedAt) });
  for (const g of d?.grants ?? []) facts.push({ k: t('admin.referrals.drawer.grants'), v: `${t('admin.referrals.drawer.grantLine', { name: g.userId === r.referrer?.id ? who(r.referrer) : referee(r), date: formatDay(g.endsAt) })}${g.revokedAt ? ` (${t('admin.referrals.drawer.grantRevoked')})` : ''}` });
  return {
    title: who(r.referrer),
    subtitle: `→ ${referee(r)}`,
    badge: pill(r),
    facts,
    steps: [
      { label: t('admin.referrals.drawer.stepInvited'), when: formatDay(r.createdAt) },
      { label: t('admin.referrals.drawer.stepSignedUp'), ...(d?.signedUpAt ? { when: formatDay(d.signedUpAt) } : {}), done: r.status !== 'invited' },
      { label: t('admin.referrals.drawer.stepQualified'), ...(d?.qualifiedAt ? { when: formatDay(d.qualifiedAt) } : {}), done: r.status === 'qualified' },
    ],
    history: (d?.audit ?? []).map((e) => auditLine(e, labels)),
    actions: actionsOf(r, d),
  };
}

type Props = { data: AdminReferralPage | null; error: string | null; page: number };

export function ReferralsView({ data, error, page }: Props) {
  const s = data?.summary;
  return (
    <AdminList<AdminReferralRow, AdminReferralDetail>
      title={t('admin.referrals.label')}
      subtitle={t('admin.referrals.subtitle')}
      searchPlaceholder={t('admin.referrals.search.placeholder')}
      headerExtra={<ExportCsv resource="referrals" keys={['q', 'status', 'channel']} file="indicacoes.csv" />}
      summary={s ? [
        { value: s.qualified, label: t('admin.referrals.summary.qualified').toLowerCase(), tone: 'brand' },
        { value: s.inProgress, label: t('admin.referrals.summary.inProgress').toLowerCase(), tone: 'ok' },
        { value: s.inReview, label: t('admin.referrals.summary.inReview').toLowerCase(), tone: 'warn' },
        { value: s.rejected, label: t('admin.referrals.summary.rejected').toLowerCase(), tone: 'bad' },
        { value: s.monthsGranted, label: t('admin.referrals.summary.monthsGranted').toLowerCase(), tone: 'brand' },
      ] : []}
      filters={[
        { param: 'status', label: t('admin.referrals.filters.status'), options: [opt('', t('admin.lists.all')), ...statuses.map((x) => opt(x, t(`admin.referrals.filters.status_${x}`)))] },
        { param: 'channel', label: t('admin.referrals.filters.channel'), options: [opt('', t('admin.lists.all')), ...channels.map((c) => opt(c, t(`admin.referrals.filters.channel_${c}`)))] },
      ]}
      caption={t('admin.referrals.table.ariaLabel')}
      columns={[
        { key: 'pair', header: t('admin.referrals.table.columns.pair'), primary: true, cell: (r) => <PersonCell name={who(r.referrer)} sub={`→ ${referee(r)}`} /> },
        { key: 'channel', header: t('admin.referrals.table.columns.channel'), cell: (r) => t(`admin.referrals.filters.channel_${r.channel}`) },
        { key: 'signals', header: t('admin.referrals.table.columns.signals'), cell: signals },
        { key: 'status', header: t('admin.referrals.table.columns.status'), cell: pill },
        { key: 'reward', header: t('admin.referrals.table.columns.reward'), cell: (r) => <b>{reward(r)}</b> },
        { key: 'when', header: t('admin.referrals.table.columns.date'), cell: (r) => <span className="whitespace-nowrap text-[13.5px] text-muted" ><When iso={r.createdAt} /></span> },
      ]}
      rows={data?.items ?? []}
      total={data?.total ?? 0}
      page={page}
      pageSize={data?.pageSize ?? 25}
      loadError={error}
      rowKey={(r) => r.id}
      rowLabel={(r) => `${t('admin.referrals.drawer.label')}: ${who(r.referrer)}`}
      detailPath={(r) => `/referrals/${r.id}`}
      drawerLabel={t('admin.referrals.drawer.label')}
      drawer={drawerOf}
    />
  );
}
