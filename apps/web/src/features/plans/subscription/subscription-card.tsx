'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { annualSavings, formatBRL, type RedirectUrl, type SwitchToAnnualResult } from '@remoa/contracts';
import { t } from '@remoa/strings';
import { Alert, Button, Icon, Morph, useToast } from '@remoa/ui';
import { track } from '@/lib/analytics';
import { api } from '@/lib/api';
import { formatDate } from '@/features/billing/format';
import { usePlans } from '../plans-context';

/** F15 FR-9: "Sua assinatura" (right column when the student is Pro). */
export function SubscriptionCard() {
  const { subscription: sub, entitlements, priceBook } = usePlans();
  const router = useRouter();
  const { toast } = useToast();
  const [busy, setBusy] = useState<'portal' | 'switch' | null>(null);
  const [error, setError] = useState(false);

  if (entitlements?.plan === 'founder') {
    return (
      <section aria-labelledby="sub-h" className="flex flex-col gap-[18px] rounded-hero border border-border bg-surface p-[26px] shadow-lift">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
          <h2 id="sub-h" className="m-0 whitespace-nowrap text-xs font-bold uppercase tracking-[0.12em] text-muted">{t('plans.subscriber.title')}</h2>
          <span className="rounded-pill bg-primary-tint px-3 py-1 text-[13px] font-bold text-primary-deep">{t('plans.subscriber.founderStatus')}</span>
        </div>
        <span className="font-display text-[44px] font-extrabold leading-none tracking-[-0.035em] text-ink">{t('plans.subscriber.founderPlan')}</span>
        <p className="m-0 text-sm leading-normal text-ink-2">{t('plans.subscriber.founderText')}</p>
      </section>
    );
  }

  // Fallback (no summary): only what the entitlements carry.
  const s = sub ?? (entitlements?.plan === 'pro'
    ? { status: entitlements.status, renewsAt: entitlements.renewsAt, cancelAtPeriodEnd: entitlements.cancelAtPeriodEnd, graceUntil: entitlements.graceUntil, period: null, method: null, amount: null, pastDue: entitlements.status === 'past_due' }
    : null);
  if (!s) return null;

  const date = s.renewsAt ? formatDate(s.renewsAt) : '';
  const pix = s.method === 'pix';

  async function post<T>(path: string): Promise<T | null> {
    setError(false);
    try {
      const r = await api<T>(path, { method: 'POST' });
      if (r.ok) return r.data;
    } catch {
      /* below */
    }
    setError(true);
    return null;
  }
  async function portal(track_ = true) {
    if (track_) track('plans_manage_clicked', {});
    setBusy('portal');
    const r = await post<RedirectUrl>('/v1/billing/portal');
    if (r) return void window.location.assign(r.url);
    setBusy(null);
  }
  async function toAnnual() {
    track('plans_annual_switch_clicked', {});
    setBusy('switch');
    const r = await post<SwitchToAnnualResult>('/v1/billing/switch-annual');
    if (r?.kind === 'redirect') return void window.location.assign(r.url);
    if (r) {
      toast({ title: t('plans.subscriber.switched') });
      router.refresh();
    }
    setBusy(null);
  }

  const status = s.pastDue ? t('plans.subscriber.status.pastDue') : s.cancelAtPeriodEnd ? t('plans.subscriber.status.canceling', { date }) : t('plans.subscriber.status.active');
  const pill = s.pastDue ? 'bg-review-bg text-review-text' : s.cancelAtPeriodEnd ? 'bg-chip text-ink-2' : 'bg-primary-tint text-primary-deep';
  const amountLine = s.amount !== null && s.period ? t(s.period === 'annual' ? 'plans.subscriber.perYear' : 'plans.subscriber.perMonth', { price: formatBRL(s.amount) }) : '';
  const rows: Array<[string, string]> = [];
  if (s.period) rows.push([t('plans.subscriber.billing'), pix ? `${t(`plans.subscriber.billingValue.${s.period}`)} · ${t('plans.subscriber.methodValue.pix')}` : t(`plans.subscriber.billingValue.${s.period}`)]);
  if (date) rows.push(s.cancelAtPeriodEnd || pix ? [t('plans.subscriber.endsAt', { date }), ''] : [t('plans.subscriber.renewal'), date]);

  const canSwitch = s.period === 'monthly' && s.method === 'card' && !s.cancelAtPeriodEnd && !s.pastDue;
  return (
    <section aria-labelledby="sub-h" className="flex flex-col gap-[18px] rounded-hero border border-border bg-surface p-[26px] shadow-lift">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
        <h2 id="sub-h" className="m-0 whitespace-nowrap text-xs font-bold uppercase tracking-[0.12em] text-muted">{t('plans.subscriber.title')}</h2>
        <span className={`rounded-pill px-3 py-1 text-[13px] font-bold ${pill}`}>{status}</span>
      </div>
      <span className="flex items-baseline gap-2">
        <span className="font-display text-[44px] font-extrabold leading-none tracking-[-0.035em] text-ink">{t('plans.subscriber.plan')}</span>
        {amountLine ? <span className="text-[15px] font-semibold text-muted"><Morph>{amountLine}</Morph></span> : null}
      </span>
      {s.pastDue && s.graceUntil ? <Alert tone="watch" title={t('plans.subscriber.pastDue', { date: formatDate(s.graceUntil) })} /> : null}
      {pix && !s.cancelAtPeriodEnd ? <Alert tone="unknown" title={t('plans.subscriber.pixRenew', { date })} /> : null}
      {error ? <Alert tone="review" role="alert" title={t('plans.subscriber.actionError')} /> : null}
      <dl className="m-0 flex flex-col">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-3 border-t border-divider py-3"><dt className="text-muted">{k}</dt><dd className="m-0 font-bold"><Morph>{v}</Morph></dd></div>
        ))}
      </dl>
      {canSwitch && priceBook ? (
        <div className="flex flex-col gap-2.5 rounded-[20px] bg-primary-tint p-4">
          <h3 className="m-0 text-base font-bold text-primary-deep">{t('plans.subscriber.upsell.title')}</h3>
          <p className="m-0 text-sm leading-normal text-ink-2">
            {t('plans.subscriber.upsell.body', { annual: formatBRL(priceBook.annual.amount), monthlyYear: formatBRL(priceBook.monthly.amount * 12), value: formatBRL(annualSavings(priceBook)) })}
          </p>
          <Button loading={busy === 'switch'} onClick={() => void toAnnual()}>{t('plans.subscriber.upsell.cta')}</Button>
        </div>
      ) : null}
      {s.cancelAtPeriodEnd && !pix ? (
        <Button loading={busy === 'portal'} onClick={() => void portal(false)}>{t('plans.subscriber.reactivate')}</Button>
      ) : null}
      {pix ? null : <Button variant="secondary" loading={busy === 'portal'} onClick={() => void portal()}>{t('plans.subscriber.manage')}</Button>}
      <p className="m-0 flex items-center justify-center gap-2 text-[12.5px] text-muted"><span aria-hidden="true" className="flex"><Icon name="lock" size={16} /></span>{t('plans.subscriber.secure')}</p>
    </section>
  );
}
