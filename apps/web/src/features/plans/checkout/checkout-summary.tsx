'use client';

import { useEffect, useRef, useState } from 'react';
import { annualSavings, formatBRL, monthlyEquivalent, type CouponValidation, type PaymentMethod, type RedirectUrl } from '@remoa/contracts';
import { t } from '@remoa/strings';
import { Alert, Button, CouponField, Icon, MethodChoice, OrderSummary, PriceTicker, RedirectOverlay } from '@remoa/ui';
import { track } from '@/lib/analytics';
import { api } from '@/lib/api';
import { usePlans } from '../plans-context';

export const MIN_REDIRECT_MS = 600;

const fmtDate = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number];
  return new Date(y, m - 1, d).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
};

function useOnline() {
  const [on, setOn] = useState(true);
  useEffect(() => {
    const sync = () => setOn(navigator.onLine);
    sync();
    window.addEventListener('online', sync);
    window.addEventListener('offline', sync);
    return () => {
      window.removeEventListener('online', sync);
      window.removeEventListener('offline', sync);
    };
  }, []);
  return on;
}

/** F15 FR-5/6/7: order summary + hand-off to Stripe Checkout. */
export function CheckoutSummary() {
  const { priceBook, period, coupon, setCoupon } = usePlans();
  const [method, setMethod] = useState<PaymentMethod>('card');
  const [redirecting, setRedirecting] = useState(false);
  const [failed, setFailed] = useState(false);
  const locked = useRef(false);
  const online = useOnline();
  // Back from Stripe restores this page from the bfcache with the overlay still up and the lock held: release both.
  useEffect(() => {
    const back = (e: PageTransitionEvent) => {
      if (!e.persisted) return;
      locked.current = false;
      setRedirecting(false);
    };
    window.addEventListener('pageshow', back);
    return () => window.removeEventListener('pageshow', back);
  }, []);

  const life = period === 'lifetime';
  const rec = period === 'lifetime' ? 'monthly' : period; // Pro recurrence; unused while buying Founder
  const list = { monthly: { amount: priceBook.monthly.amount }, annual: { amount: priceBook.annual.amount } };
  const eff = coupon ? { monthly: { amount: coupon.prices.monthly }, annual: { amount: coupon.prices.annual } } : list;
  const today = life ? priceBook.lifetime.amount : eff[rec].amount;
  const periodName = t(`plans.summary.totals.period.${rec}`);

  const pickMethod = (m: string) => {
    setMethod(m as PaymentMethod);
    track('plans_method_selected', { method: m as PaymentMethod });
  };

  const applyCoupon = async (code: string) => {
    try {
      const r = await api<CouponValidation>('/v1/billing/coupon', { method: 'POST', body: JSON.stringify({ code }) });
      if (r.ok && r.data.valid) {
        setCoupon({ code, prices: r.data });
        track('coupon_applied', {});
        return true;
      }
    } catch {
      /* network: same as invalid */
    }
    track('coupon_failed', {});
    return false;
  };

  const subscribe = async () => {
    if (locked.current || !online) return;
    locked.current = true;
    setFailed(false);
    setRedirecting(true);
    track('checkout_started', { period, method, coupon: coupon !== null && !life });
    const body = { period, method, ...(coupon && !life ? { couponCode: coupon.code } : {}) };
    try {
      const [r] = await Promise.all([
        api<RedirectUrl>('/v1/billing/checkout', { method: 'POST', body: JSON.stringify(body) }),
        new Promise((res) => setTimeout(res, MIN_REDIRECT_MS)),
      ]);
      if (r.ok) {
        track('checkout_redirected', { period, method });
        window.location.assign(r.data.url); // stays locked: the page is leaving
        return;
      }
    } catch {
      /* fall through */
    }
    setRedirecting(false);
    setFailed(true);
    locked.current = false;
  };

  // Planos.dc.html: the list-price line is always there (struck through once a founder code lowers it).
  const listLine = life
    ? { label: t('plans.summary.founderLine'), value: formatBRL(today) }
    : { label: t('plans.summary.totals.list', { period: periodName }), value: formatBRL(list[rec].amount) };
  const lines = coupon && !life
    ? [
        { ...listLine, struck: true, srLabel: t('plans.summary.totals.listSr') },
        { label: t('plans.summary.totals.founder'), value: formatBRL(today), founder: true },
        { label: t('plans.summary.totals.today'), value: formatBRL(today), strong: true },
      ]
    : [listLine, { label: t('plans.summary.totals.today'), value: formatBRL(today), strong: true }];
  const saving = period === 'annual' ? annualSavings(eff) : 0;
  const note = life ? t('plans.summary.founderNote') : period === 'annual' ? t('plans.summary.billingNote.annual', { price: formatBRL(monthlyEquivalent(eff)) }) : t('plans.summary.billingNote.monthly');

  return (
    <>
      <OrderSummary
        label={t('plans.summary.title')}
        badge={t(life ? 'plans.summary.founderPlanName' : 'plans.summary.planName')}
        price={<PriceTicker value={today} format={formatBRL} />}
        per={t(life ? 'plans.summary.founderPer' : period === 'annual' ? 'plans.summary.totals.unitYear' : 'plans.summary.totals.unitMonth')}
        note={method === 'pix' && !life ? `${note} ${t('plans.summary.method.pixNote')}` : note}
        saving={saving > 0 ? t('plans.summary.saving', { value: formatBRL(saving) }) : undefined}
        methodLabel={t('plans.summary.method.label')}
        method={
          <MethodChoice
            label={t('plans.summary.method.label')}
            value={method}
            onChange={pickMethod}
            options={[
              { value: 'card', label: t('plans.summary.method.card.label'), description: t('plans.summary.method.card.desc'), icon: <Icon name="creditCard" size={24} /> },
              { value: 'pix', label: t('plans.summary.method.pix.label'), description: t('plans.summary.method.pix.desc'), icon: <Icon name="pix" size={24} />, disabled: true, badge: t('plans.summary.method.soon') },
            ]}
          />
        }
        coupon={life ? undefined : (
          <CouponField
            toggleLabel={t('plans.summary.founder.open')}
            inputLabel={t('plans.summary.founder.label')}
            placeholder={t('plans.summary.founder.placeholder')}
            applyLabel={t('plans.summary.founder.apply')}
            appliedLabel={t('plans.summary.founder.applied')}
            removeLabel={t('plans.summary.founder.remove')}
            errorMessage={t('plans.summary.founder.error')}
            applied={coupon !== null}
            onApply={applyCoupon}
            onRemove={() => setCoupon(null)}
          />
        )}
        lines={lines}
        nextBilling={life ? undefined : t('plans.summary.nextCharge', { date: fmtDate(priceBook.nextChargeOn[rec]) })}
        action={
          <>
            {failed ? (
              <Alert tone="review" title={t('plans.states.checkoutError')} role="alert">
                <Button variant="secondary" onClick={() => void subscribe()} disabled={!online}>{t('plans.states.retry')}</Button>
              </Alert>
            ) : null}
            {!online ? <Alert tone="watch" title={t('plans.states.offline')} /> : null}
            <Button size="cta" icon={<Icon name="sparkle" size={20} />} disabled={!online || redirecting} onClick={() => void subscribe()}>{t(life ? 'plans.summary.founderSubscribe' : 'plans.summary.subscribe')}</Button>
          </>
        }
        secure={t('plans.summary.secure')}
        secureIcon={<Icon name="lock" size={16} />}
      />
      {redirecting ? <RedirectOverlay title={t('plans.redirecting.title')} description={t('plans.redirecting.body', { method: t(`plans.redirecting.method.${method}`) })} /> : null}
    </>
  );
}
