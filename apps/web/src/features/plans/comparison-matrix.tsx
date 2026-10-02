'use client';

import { comparisonRows, formatBRL, type ComparisonRow as Row, type PlanFeatureKey } from '@remoa/contracts';
import { t } from '@remoa/strings';
import { ComparisonTable, PlanColumnHeader, PriceTicker, type ComparisonRow } from '@remoa/ui';
import { usePlans } from './plans-context';

const num = new Intl.NumberFormat('pt-BR');
const n = (v: number | null, unlimited: string) => (v === null ? unlimited : num.format(v));

const labels: Record<PlanFeatureKey, { label: string; sub: string; unlimited: string }> = {
  boards: { label: t('plans.matrix.rows.boards.label'), sub: t('plans.matrix.rows.boards.sub'), unlimited: t('plans.matrix.unlimited.boards') },
  cards: { label: t('plans.matrix.rows.cards.label'), sub: t('plans.matrix.rows.cards.sub'), unlimited: t('plans.matrix.unlimited.cards') },
  ai_grades: { label: t('plans.matrix.rows.aiGrades.label'), sub: t('plans.matrix.rows.aiGrades.sub'), unlimited: t('plans.matrix.unlimited.aiGrades') },
  ai_generations: { label: t('plans.matrix.rows.pdfMaps.label'), sub: t('plans.matrix.rows.pdfMaps.sub'), unlimited: '' },
  anki_import_cards: { label: t('plans.matrix.rows.ankiImport.label'), sub: t('plans.matrix.rows.ankiImport.sub'), unlimited: '' },
  new_cards_per_day: { label: t('plans.matrix.rows.newCards.label'), sub: t('plans.matrix.rows.newCards.sub'), unlimited: '' },
};

function usageText(r: Row): string {
  const u = r.usage!;
  const vars = { used: num.format(u.used), limit: u.limit === null ? '' : num.format(u.limit) };
  if (u.limit === null) {
    if (r.key === 'boards') return t('plans.matrix.usage.proBoards', { used: u.used });
    if (r.key === 'cards') return t('plans.matrix.usage.proCards', { used: u.used });
    return t('plans.matrix.usage.proNoDailyLimit');
  }
  if (r.key === 'ai_grades') return t('plans.matrix.usage.today', vars);
  if (r.key === 'ai_generations') return t('plans.matrix.usage.month', vars);
  return t('plans.matrix.usage.total', vars);
}

/** F15 FR-4. Values come from the contract's single plan definition; usage shows only in the current plan's column. */
export function ComparisonMatrix({ recommended }: { recommended: boolean }) {
  const { priceBook, entitlements, period, coupon } = usePlans();
  const pro = entitlements?.plan === 'pro';
  const rows: ComparisonRow[] = comparisonRows(entitlements).map((r) => {
    const unlimited = r.pro === null;
    const free = r.free ?? 0;
    return {
      id: r.key,
      label: labels[r.key].label,
      sub: labels[r.key].sub,
      free: n(r.free, labels[r.key].unlimited),
      pro: n(r.pro, labels[r.key].unlimited),
      unlimited,
      // Illustrative: Free's share of Pro's limit, never below 6%; unlimited rows keep the default short bar.
      freeBar: unlimited || !r.pro ? undefined : Math.min(100, Math.max(6, Math.round((free / r.pro) * 100))),
      usage: r.usage ? { text: usageText(r), tone: r.usage.tone === 'full' ? 'danger' : r.usage.tone === 'warn' ? 'warn' : 'normal' } : undefined,
    };
  });
  const prices = coupon?.prices ?? { monthly: priceBook.monthly.amount, annual: priceBook.annual.amount };
  const proPrice = period === 'annual' ? prices.annual : prices.monthly; // the mock shows the period's price (R$ 249,00 /ano)
  const chip = (current: boolean, rec = false) => (current ? t('plans.matrix.currentPlan') : rec ? t('plans.matrix.recommended') : undefined);
  return (
    <ComparisonTable
      caption={t('plans.matrix.caption')}
      cornerLabel={t('plans.matrix.feature')}
      current={pro ? 'pro' : 'free'}
      freeHeader={<PlanColumnHeader plan="free" name={t('billing.plan.free')} price={t('plans.matrix.freePrice')} chip={chip(!pro)} />}
      proHeader={
        <PlanColumnHeader
          plan="pro"
          name={t('billing.plan.pro')}
          price={<PriceTicker value={proPrice} format={formatBRL} />}
          per={t(period === 'annual' ? 'plans.summary.totals.unitYear' : 'plans.summary.totals.unitMonth')}
          chip={chip(pro, recommended)}
        />
      }
      rows={rows}
    />
  );
}
