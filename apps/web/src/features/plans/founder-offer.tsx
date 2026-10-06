'use client';

import { formatBRL } from '@remoa/contracts';
import { withStrings } from '@remoa/strings';
import * as more from '@remoa/strings/ns';
import { Button, Icon } from '@remoa/ui';
import { track } from '@/lib/analytics';
import { usePlans } from './plans-context';

const t = withStrings({ plans: more.plans });

/** Founder: one-time lifetime purchase, offered to Free. Choosing it swaps the order summary to `period: 'lifetime'`; "Prefiro o Pro" swaps back. */
export function FounderOffer() {
  const { priceBook, period, setPeriod } = usePlans();
  const on = period === 'lifetime';
  const pick = () => {
    setPeriod(on ? 'monthly' : 'lifetime');
    if (!on) track('plans_period_changed', { period: 'lifetime' });
    document.getElementById('resumo')?.scrollIntoView?.({ block: 'nearest' });
  };
  return (
    <section aria-labelledby="plans-founder" className="flex flex-wrap items-center justify-between gap-5 rounded-list border border-border bg-surface px-5 py-5 md:px-7">
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <h2 id="plans-founder" className="m-0 flex flex-wrap items-baseline gap-x-3 font-display text-[22px] font-extrabold tracking-[-0.02em] text-ink">
          {t('plans.founderOffer.title')}
          <span className="tabular-nums">{formatBRL(priceBook.lifetime.amount)}</span>
          <span className="text-[15px] font-semibold text-muted">{t('plans.founderOffer.price')}</span>
        </h2>
        <p className="m-0 text-sm text-muted">{t('plans.founderOffer.description')}</p>
        <ul className="m-0 mt-1 flex list-none flex-wrap gap-x-5 gap-y-1 p-0 text-sm text-ink">
          {more.plans.founderOffer.benefits.map((b) => (
            <li key={b} className="flex items-center gap-1.5"><Icon name="check" size={16} />{b}</li>
          ))}
        </ul>
      </div>
      <Button variant={on ? 'secondary' : 'primary'} aria-pressed={on} onClick={pick}>{t(on ? 'plans.founderOffer.back' : 'plans.founderOffer.choose')}</Button>
    </section>
  );
}
