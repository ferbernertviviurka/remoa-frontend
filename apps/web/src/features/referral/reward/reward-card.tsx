'use client';

import type { ReferralSummary } from '@remoa/contracts';
import { t } from '@remoa/strings';
import { RewardStat } from '@remoa/ui';
import { useEntitlements } from '@/features/shell/entitlements';
import { isPaid, longDate, shortDate } from '../format';

const DAY = 86_400_000;
const brl = (cents: number) => (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

/** FR-8: "Seu Pro grátis". Free: "Pro grátis até {data}" com barra de dias; Pro: crédito nas próximas cobranças. */
export function RewardCard({ summary, pulse, loading }: { summary: ReferralSummary | null; pulse?: boolean; loading?: boolean }) {
  const { entitlements } = useEntitlements();
  const common = { label: t('referral.reward.label'), unitOne: t('referral.reward.monthsUnit', { n: 1 }), unitMany: t('referral.reward.monthsUnit', { n: 2 }) };
  if (!summary || loading) return <RewardStat {...common} months={0} emptyText="" historyTitle="" history={[]} historyEmpty="" note="" loadingLabel={t('referral.errors.loading')} />;
  const plan = entitlements?.plan;
  const founder = plan === 'founder'; // vitalício: sem cobrança recorrente, sem barra de dias nem crédito (D-398)
  const paid = !founder && isPaid(summary, plan);
  const daysLeft = summary.proUntil ? Math.max(0, Math.ceil((new Date(summary.proUntil).getTime() - Date.now()) / DAY)) : 0;
  return (
    <RewardStat
      {...common}
      months={summary.monthsEarned}
      untilText={founder ? undefined : summary.proUntil ? t('referral.reward.proUntil', { date: longDate(summary.proUntil) }) : paid ? t('referral.reward.creditUntil') : undefined}
      days={!founder && summary.proUntil && !paid ? { left: daysLeft, total: summary.proDaysTotal, text: t('referral.reward.daysLeft', { days: daysLeft }) } : undefined}
      emptyText={t('referral.reward.emptyState')}
      historyTitle={t('referral.reward.lastRewards')}
      history={summary.recentRewards.map((r) => ({
        id: r.id,
        title: r.kind === 'credit' && r.amount ? t('referral.page.creditTitle', { amount: brl(r.amount) }) : t('referral.reward.grantedOne'),
        detail: t('referral.page.rewardDetail', { name: r.friendName ?? t('referral.page.fallbackName'), date: shortDate(r.grantedAt) }),
      }))}
      historyEmpty={t('referral.reward.emptyHistory')}
      note={founder ? t('referral.reward.notePlanFounder') : paid ? t('referral.reward.notePlanPro') : t('referral.reward.notePlanFree')}
      pulse={pulse}
    />
  );
}
