'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PLAN_LIMITS, formatBRL as formatCents, usageRows, type PriceBook, type QuotaKey, type RedirectUrl, type UsageRow } from '@remoa/contracts';
import { t } from '@remoa/strings';
import { Alert, Button, Icon, Morph, Segmented, UsageMeter, UsageWarning, useToast } from '@remoa/ui';
import { track } from '@/lib/analytics';
import { api } from '@/lib/api';
import { formatDate } from '@/features/billing/format';
import { SectionCard } from '../shared/section-card';
import { useAccount } from '../shell/account-context';

type Period = 'monthly' | 'annual';
const nextMonth = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + 1, 1);
};
const meta: Record<QuotaKey, { label: string; masc: boolean }> = {
  ai_grades: { label: 'aiGrades', masc: false },
  ai_generations: { label: 'pdf', masc: false },
  boards: { label: 'boards', masc: true },
  cards: { label: 'cards', masc: true },
};

export function PlanSection() {
  const { account } = useAccount();
  const ent = account.entitlements;
  const founder = ent.plan === 'founder';
  const pro = ent.plan !== 'free';
  const router = useRouter();
  const params = useSearchParams();
  const { toast } = useToast();
  const [period, setPeriod] = useState<Period>('monthly');
  const [busy, setBusy] = useState<'portal' | 'cancel' | null>(null);
  const [error, setError] = useState(false);
  // P-094: same source as /app/planos (GET /v1/billing/prices, centavos); no hard-coded fallback.
  const [prices, setPrices] = useState<PriceBook | null>(null);
  useEffect(() => {
    if (pro) return;
    let alive = true;
    Promise.resolve(api<PriceBook>('/v1/billing/prices'))
      .then((r) => alive && r.ok && setPrices(r.data))
      .catch(() => undefined); // price stays "unavailable"; upgrade still goes to /app/planos
    return () => {
      alive = false;
    };
  }, [pro]);
  const announced = useRef(false);
  const notice = params.get('checkout') === 'ok' ? 'checkout' : params.get('portal') === 'ok' ? 'portal' : null;

  useEffect(() => {
    if (!notice || announced.current) return;
    announced.current = true;
    toast({ title: t(notice === 'checkout' ? 'billing.account.checkoutOk' : 'billing.account.portalOk') });
    router.replace('/app/conta/plano'); // so a refresh doesn't announce (and track) it again
  }, [notice, router, toast]);

  const upgrade = (source: 'account_plan' | 'usage_nudge') => {
    track('upgrade_clicked', { source });
    // D-180: every upgrade converges on /planos; the period chosen here carries over.
    router.push(`/app/planos?de=${source}${source === 'account_plan' && period === 'annual' ? '&periodo=anual' : ''}`);
  };

  async function portal(cancel: boolean) {
    setBusy(cancel ? 'cancel' : 'portal');
    setError(false);
    try {
      const r = await api<RedirectUrl>('/v1/billing/portal', { method: 'POST', body: JSON.stringify(cancel ? { cancel: true } : {}) });
      if (r.ok) {
        return void window.location.assign(r.data.url);
      }
    } catch {
      /* message below */
    }
    setError(true);
    setBusy(null);
  }

  const renewal = ent.renewsAt ? formatDate(ent.renewsAt) : null;
  const price = prices ? formatCents(prices[period].amount).replace(/,00$/, '') : t('account.plan.priceUnavailable');
  const perks = [
    t('account.plan.perks.unlimited'),
    t('account.plan.perks.ai', { n: PLAN_LIMITS.pro.limits.ai_grades ?? 0 }),
    t('account.plan.perks.pdf', { n: PLAN_LIMITS.pro.limits.ai_generations ?? 0 }),
    t('account.plan.perks.seeds'),
  ];

  const meter = (r: UsageRow) => {
    const m = meta[r.key];
    const label = t(`account.plan.usage.${m.label as 'aiGrades'}`);
    const limit = r.limit;
    const unlimited = limit === null;
    const sub =
      r.key === 'ai_grades'
        ? t(unlimited ? 'account.plan.usage.aiGradesPro' : 'account.plan.usage.aiGradesFree')
        : r.key === 'ai_generations'
          ? t('account.plan.usage.pdfSub', { date: formatDate(nextMonth()) })
          : t('account.plan.usage.totalSub');
    const notIncluded = limit === 0;
    const value = notIncluded ? t('account.plan.usage.notIncluded') : unlimited ? t(m.masc ? 'account.plan.usage.unlimitedMasc' : 'account.plan.usage.unlimitedFem') : t('account.plan.usage.value', { used: r.used, limit: limit ?? 0 });
    const tone = unlimited ? 'unlimited' : r.tone === 'full' ? 'danger' : r.tone;
    const warning =
      !pro && !notIncluded && r.tone !== 'normal' ? (
        <UsageWarning action={<Button size="sm" variant="secondary" onClick={() => upgrade('usage_nudge')}>{t('account.plan.seePro')}</Button>}>
          {t(r.tone === 'full' ? 'account.plan.atLimit' : 'account.plan.nearLimit')}
        </UsageWarning>
      ) : undefined;
    return <UsageMeter key={r.key} label={label} sub={sub} value={value} percent={limit ? (r.used / limit) * 100 : 100} tone={tone} warning={warning} />;
  };

  return (
    <div className="flex flex-col gap-6">
      {error ? <Alert tone="review" role="alert" title={t('billing.account.portalError')} /> : null}
      {ent.status === 'past_due' ? <Alert tone="watch" title={t('account.plan.pastDue')} /> : null}
      {ent.graceUntil ? <Alert tone="watch" title={t('billing.account.grace', { date: formatDate(ent.graceUntil) })} /> : null}

      <section aria-labelledby="plan-h" className="flex flex-col items-stretch gap-7 rounded-[28px] bg-primary px-[30px] py-7 text-on-dark md:flex-row">
        <div className="flex min-w-0 flex-1 flex-col gap-2.5">
          <p className="m-0 text-xs font-bold uppercase tracking-[.12em] text-on-dark">{t('account.plan.title')}</p>
          <h2 id="plan-h" className="m-0 font-display text-[44px] font-extrabold leading-none tracking-[-0.035em]">{t(`billing.plan.${ent.plan}`)}</h2>
          {founder ? (
            <p className="m-0 max-w-[360px]">{t('account.plan.founderText')}</p>
          ) : pro ? (
            <>
              <p className="m-0 max-w-[360px]">{t('account.plan.proText', { ai: PLAN_LIMITS.pro.limits.ai_grades ?? 0, pdf: PLAN_LIMITS.pro.limits.ai_generations ?? 0, date: renewal ?? '' })}</p>
              {renewal && ent.cancelAtPeriodEnd ? <p className="m-0 text-sm">{t('billing.account.cancelsAt', { date: renewal })}</p> : null} {/* the active state already reads "Renova em …" in proText, as in the mock */}
              <div className="mt-auto flex flex-wrap gap-2">
                <Button variant="outline-light" loading={busy === 'portal'} onClick={() => void portal(false)}>{t('account.plan.manage')}</Button>
                {ent.cancelAtPeriodEnd ? null : <Button variant="outline-light" loading={busy === 'cancel'} onClick={() => void portal(true)}>{t('billing.account.cancel')}</Button>}
              </div>
            </>
          ) : (
            <p className="m-0 max-w-[360px]">{t('account.plan.freeText', { boards: PLAN_LIMITS.free.limits.boards, cards: PLAN_LIMITS.free.limits.cards, ai: PLAN_LIMITS.free.limits.ai_grades })}</p>
          )}
        </div>
        {pro ? null : (
          <div className="flex shrink-0 flex-col gap-3.5 rounded-[22px] bg-surface p-[22px] text-ink md:w-[360px]">
            <div className="flex items-center justify-between gap-3">
              <h3 className="m-0 font-display text-[22px] font-extrabold">{t('account.plan.offerTitle')}</h3>
              <Segmented
                aria-label={t('account.plan.billingLabel')}
                value={period}
                onValueChange={(v) => setPeriod(v as Period)}
                options={[
                  { value: 'monthly', label: t('billing.pricing.monthly') },
                  { value: 'annual', label: t('billing.pricing.annual') },
                ]}
              />
            </div>
            <p className="m-0 flex items-baseline gap-1.5">
              <span className="font-display text-[40px] font-extrabold leading-none tracking-[-0.03em] tabular-nums"><Morph>{price}</Morph></span>
              <span className="font-semibold text-muted"><Morph>{t(period === 'monthly' ? 'billing.pricing.perMonth' : 'billing.pricing.perYear', { price: '' })}</Morph></span>
            </p>
            <p className="-mt-2 m-0 min-h-[2.6em] text-[13px] text-muted tabular-nums">
              <Morph>{period === 'monthly' ? t('account.plan.monthlyNote') : t('account.plan.annualNote', { price: prices ? formatCents(Math.round(prices.annual.amount / 12)) : '' })}</Morph>
            </p>
            <ul className="m-0 flex list-none flex-col gap-2 p-0 text-sm">
              {perks.map((p) => (
                <li key={p} className="flex items-center gap-2.5">
                  <Icon name="check" size={18} />
                  {p}
                </li>
              ))}
            </ul>
            <div className="[&>button]:w-full [&>button]:min-h-[50px] [&>button]:rounded-[15px] [&>button]:bg-panel-dark">
              <Button onClick={() => upgrade('account_plan')}>{t('account.plan.subscribe')}</Button>
            </div>
            <p className="m-0 text-center text-[12.5px] text-muted">{t('account.plan.reassure')}</p>
          </div>
        )}
      </section>

      <SectionCard
        title={t('referral.accountEntry')}
        body={t('referral.accountEntryDesc')}
        action={<Button variant="secondary" icon={<Icon name="gift" size={18} />} onClick={() => router.push('/app/indicar?de=account')}>{t('referral.accountEntryCta')}</Button>}
      />

      <SectionCard title={t('account.plan.usageTitle')} body={t('account.plan.usageBody')}>
        {usageRows(ent).map(meter)}
      </SectionCard>
    </div>
  );
}
