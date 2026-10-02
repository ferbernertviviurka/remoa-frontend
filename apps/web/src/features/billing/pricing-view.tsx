'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PLAN_LIMITS, PRICES_BRL, type CheckoutInput, type RedirectUrl } from '@remoa/contracts';
import { t } from '@remoa/strings';
import { Alert, Button, Card, Checkbox, Segmented } from '@remoa/ui';
import { track } from '@/lib/analytics';
import { api } from '@/lib/api';
import { formatBRL, formatLimit } from './format';

type Period = CheckoutInput['period'];
type Method = CheckoutInput['method'];

const { free, pro } = PLAN_LIMITS;
const rows = [
  { key: 'boards', free: formatLimit(free.limits.boards), pro: formatLimit(pro.limits.boards) },
  { key: 'cards', free: formatLimit(free.limits.cards), pro: formatLimit(pro.limits.cards) },
  { key: 'ai_grades', free: formatLimit(free.limits.ai_grades), pro: formatLimit(pro.limits.ai_grades) },
  { key: 'ai_generations', free: formatLimit(free.limits.ai_generations), pro: formatLimit(pro.limits.ai_generations) },
  { key: 'anki', free: formatLimit(free.ankiImportMaxCards), pro: formatLimit(pro.ankiImportMaxCards) },
  { key: 'newCards', free: formatLimit(free.newCardsPerDay), pro: formatLimit(pro.newCardsPerDay) },
] as const;

export function PricingView({ loggedIn, isPro }: { loggedIn: boolean; isPro: boolean }) {
  const router = useRouter();
  const [period, setPeriod] = useState<Period>('monthly');
  const [method, setMethod] = useState<Method>('pix');
  const [founder, setFounder] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function subscribe() {
    if (!loggedIn) return router.push(`/cadastro?next=${encodeURIComponent('/precos')}`);
    setBusy(true);
    setError(false);
    track('checkout_started', { period, method });
    const body: CheckoutInput = { period, method, ...(founder ? { coupon: 'FUNDADOR' } : {}) };
    try {
      const r = await api<RedirectUrl>('/v1/billing/checkout', { method: 'POST', body: JSON.stringify(body) });
      if (r.ok) return void window.location.assign(r.data.url); // keep busy: the page is leaving
      setError(true);
    } catch {
      setError(true);
    }
    setBusy(false);
  }

  const price = formatBRL(PRICES_BRL[period]);
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 md:p-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-3xl font-extrabold text-text">{t('billing.pricing.title')}</h1>
        <p className="text-muted">{t('billing.pricing.subtitle')}</p>
      </header>

      <Card radius="review">
        <table className="w-full border-collapse text-left text-sm">
          <caption className="sr-only">{t('billing.pricing.tableLabel')}</caption>
          <thead>
            <tr className="border-b border-border">
              <th scope="col" className="py-2 pr-2 font-semibold text-muted">{t('billing.pricing.feature')}</th>
              <th scope="col" className="py-2 pr-2 font-bold">{t('billing.plan.free')}</th>
              <th scope="col" className="py-2 font-bold text-primary-deep">{t('billing.plan.pro')}</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-border">
              <th scope="row" className="py-3 pr-2 font-semibold">{t('billing.pricing.price')}</th>
              <td className="py-3 pr-2">{t('billing.pricing.freePrice')}</td>
              <td className="py-3">{t('billing.pricing.perMonth', { price: formatBRL(PRICES_BRL.monthly) })}</td>
            </tr>
            {rows.map((r) => (
              <tr key={r.key} className="border-b border-border last:border-0">
                <th scope="row" className="py-3 pr-2 font-semibold">{t(`billing.pricing.${r.key}`)}</th>
                <td className="py-3 pr-2">{r.free}</td>
                <td className="py-3">{r.pro}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {isPro ? (
        <Alert tone="steady" title={t('billing.pricing.alreadyPro')}>
          <Button variant="secondary" onClick={() => router.push('/conta')}>{t('billing.pricing.manage')}</Button>
        </Alert>
      ) : (
        <Card radius="review">
          <div className="flex flex-col items-start gap-4">
            <Segmented
              aria-label={t('billing.pricing.periodLabel')}
              value={period}
              onValueChange={(v) => setPeriod(v as Period)}
              options={[
                { value: 'monthly', label: t('billing.pricing.monthly') },
                { value: 'annual', label: t('billing.pricing.annual') },
              ]}
            />
            <p className="font-display text-2xl font-extrabold text-text">
              {t(period === 'monthly' ? 'billing.pricing.perMonth' : 'billing.pricing.perYear', { price })}
            </p>
            {period === 'annual' ? <p className="-mt-3 text-sm text-muted">{t('billing.pricing.annualHint', { price: formatBRL(PRICES_BRL.annual / 12) })}</p> : null}
            <Segmented
              aria-label={t('billing.pricing.methodLabel')}
              value={method}
              onValueChange={(v) => setMethod(v as Method)}
              options={[
                { value: 'pix', label: t('billing.pricing.pix') },
                { value: 'card', label: t('billing.pricing.card') },
              ]}
            />
            <Checkbox label={t('billing.pricing.founder')} checked={founder} onCheckedChange={(c) => setFounder(c === true)} />
            {error ? <p role="alert" className="text-sm font-semibold text-review-text">{t('billing.pricing.error')}</p> : null}
            <Button size="lg" loading={busy} loadingLabel={t('billing.pricing.ctaBusy')} onClick={() => void subscribe()}>
              {t('billing.pricing.cta')}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
