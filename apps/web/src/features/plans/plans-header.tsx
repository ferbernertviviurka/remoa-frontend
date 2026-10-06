'use client';

import { annualDiscountPercent } from '@remoa/contracts/constants';
import { withStrings } from '@remoa/strings';
import * as more from '@remoa/strings/ns';
import { PeriodToggle } from '@remoa/ui';
import { track } from '@/lib/analytics';
import { usePlans } from './plans-context';

const t = withStrings({ plans: more.plans });

/** F15 FR-2: personalized title; the period toggle exists only for Free and its label is computed, never typed. */
export function PlansHeader({ tier }: { tier: 'free' | 'pro' | 'founder' }) {
  const { priceBook, period, setPeriod } = usePlans();
  const pct = annualDiscountPercent(priceBook);
  const k = tier;
  return (
    <header className="flex flex-wrap items-end justify-between gap-6">
      <div className="flex flex-col gap-2 pb-0.5">
        <p className="m-0 text-xs font-bold uppercase leading-[18px] tracking-[.12em] text-muted -mb-1">{t('plans.header.eyebrow')}</p>
        <h1 className="m-0 max-w-[760px] font-display text-[34px] font-extrabold leading-[1.2] tracking-[-0.035em] text-ink md:text-[46px]">
          {t(`plans.header.${k}.title`)}
        </h1>
        <p className="m-0 -mt-px max-w-[620px] text-base leading-5 text-muted">{t(`plans.header.${k}.subtitle`)}</p>
      </div>
      {tier !== 'free' || period === 'lifetime' ? null : (
        <PeriodToggle
          aria-label={t('plans.period.label')}
          value={period}
          onValueChange={(p) => {
            setPeriod(p);
            track('plans_period_changed', { period: p });
          }}
          monthlyLabel={t('plans.period.monthly')}
          annualLabel={t('plans.period.annual')}
          discountLabel={pct > 0 ? t('plans.period.discount', { pct }) : undefined}
        />
      )}
    </header>
  );
}
