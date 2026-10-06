'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { plansFromSources } from '@remoa/contracts/constants';
import { withStrings } from '@remoa/strings';
import * as more from '@remoa/strings/ns';
import { Alert, Button, Icon, useToast } from '@remoa/ui';
import { track } from '@/lib/analytics';
import { formatDate } from '@/features/billing/format';
import { CheckoutSummary } from './checkout/checkout-summary';
import { ComparisonMatrix } from './comparison-matrix';
import { FounderOffer } from './founder-offer';
import { freeProOf } from './free-pro';
import { LimitNotice, limitHit } from './limit-notice';
import { PlansFaq } from './plans-faq';
import { PlansHeader } from './plans-header';
import { usePlans } from './plans-context';
import { SubscriptionCard } from './subscription/subscription-card';

const t = withStrings({ plans: more.plans });

type From = (typeof plansFromSources)[number];
/** `?de=` is untrusted: anything outside the contract's list is `direct`. */
export const parseFrom = (de: string | undefined): From => ((plansFromSources as readonly string[]).includes(de ?? '') ? (de as From) : 'direct');

/** F15 FR-1..FR-4, FR-10. Matrix left, summary (Free) or subscription (Pro) fixed right from 1100 px, below the matrix otherwise. */
export function PlansView({ from, canceled }: { from?: string; canceled: boolean }) {
  const { entitlements, subscription } = usePlans();
  const router = useRouter();
  const { toast } = useToast();
  const sent = useRef(false);
  const founder = entitlements?.plan === 'founder';
  const gift = freeProOf(entitlements);
  // D-1213: a Pro with no subscription (trial, referral months) still buys, so it gets the Free page plus the end date
  const pro = founder || (entitlements?.plan === 'pro' && !gift) || (entitlements === null && subscription !== null);
  const hit = limitHit(entitlements);

  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    track('plans_viewed', { from: parseFrom(from) });
    if (canceled) {
      track('checkout_canceled', {});
      toast({ title: t('plans.canceled.message') });
      router.replace('/app/planos'); // so a refresh doesn't announce (and track) it again
    }
  }, [from, canceled, router, toast]);

  return (
    <div className="mx-auto flex w-full max-w-[1304px] flex-col gap-[26px] md:px-6 md:py-2">
      <PlansHeader tier={founder ? 'founder' : pro ? 'pro' : 'free'} />
      {gift ? (
        <Alert tone="brand" title={t(`plan.popover.freePro.${gift.kind}Title`)}>
          {t(`plan.popover.freePro.${gift.kind}Text`, { date: formatDate(gift.until), days: gift.days })}
        </Alert>
      ) : null}
      {hit ? <LimitNotice hit={hit} /> : null}
      {pro ? null : (
        <section aria-labelledby="plans-referral" className="flex flex-wrap items-center justify-between gap-4 rounded-list border border-border bg-primary-tint px-5 py-4 md:px-7">
          <div className="flex min-w-0 flex-col gap-0.5">
            <h2 id="plans-referral" className="m-0 font-display text-[20px] font-extrabold tracking-[-0.02em] text-ink">{t('referral.plansPromo')}</h2>
            <p className="m-0 text-sm text-muted">{t('referral.plansPromoDesc')}</p>
          </div>
          <Button variant="secondary" icon={<Icon name="gift" size={18} />} onClick={() => router.push('/app/indicar?de=plans')}>{t('referral.plansPromoCta')}</Button>
        </section>
      )}
      {pro ? null : <FounderOffer />}
      <div className="grid items-start gap-7 min-[1100px]:grid-cols-[minmax(0,1fr)_380px]">
        {founder ? null : <section aria-labelledby="plans-matrix" className="flex flex-col rounded-[30px] border border-border bg-surface px-4 pb-3.5 pt-6 md:px-6">
            <h2 id="plans-matrix" className="m-0 mb-4 font-display text-[25px] font-extrabold tracking-[-0.025em] text-ink">
              {t('plans.matrix.title')}
            </h2>
            <ComparisonMatrix recommended={hit !== null} />
          </section>}
        <div id="resumo" className="min-[1100px]:sticky min-[1100px]:top-6 min-[1100px]:col-start-2 min-[1100px]:row-span-2 min-[1100px]:row-start-1">
          {pro ? <SubscriptionCard /> : <CheckoutSummary />}
        </div>
        <div className="min-[1100px]:col-start-1">
          <PlansFaq />
        </div>
      </div>
    </div>
  );
}
