'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { plansFromSources } from '@remoa/contracts';
import { t } from '@remoa/strings';
import { useToast } from '@remoa/ui';
import { track } from '@/lib/analytics';
import { CheckoutSummary } from './checkout/checkout-summary';
import { ComparisonMatrix } from './comparison-matrix';
import { LimitNotice, limitHit } from './limit-notice';
import { PlansFaq } from './plans-faq';
import { PlansHeader } from './plans-header';
import { usePlans } from './plans-context';
import { SubscriptionCard } from './subscription/subscription-card';

type From = (typeof plansFromSources)[number];
/** `?de=` is untrusted: anything outside the contract's list is `direct`. */
export const parseFrom = (de: string | undefined): From => ((plansFromSources as readonly string[]).includes(de ?? '') ? (de as From) : 'direct');

/** F15 FR-1..FR-4, FR-10. Matrix left, summary (Free) or subscription (Pro) fixed right from 1100 px, below the matrix otherwise. */
export function PlansView({ from, canceled }: { from?: string; canceled: boolean }) {
  const { entitlements, subscription } = usePlans();
  const router = useRouter();
  const { toast } = useToast();
  const sent = useRef(false);
  const pro = entitlements?.plan === 'pro' || (entitlements === null && subscription !== null);
  const hit = limitHit(entitlements);

  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    track('plans_viewed', { from: parseFrom(from) });
    if (canceled) {
      track('checkout_canceled', {});
      toast({ title: t('plans.canceled.message') });
      router.replace('/planos'); // so a refresh doesn't announce (and track) it again
    }
  }, [from, canceled, router, toast]);

  return (
    <div className="mx-auto flex w-full max-w-[1304px] flex-col gap-[26px] md:px-6 md:py-2">
      <PlansHeader pro={pro} />
      {hit ? <LimitNotice hit={hit} /> : null}
      <div className="grid items-start gap-7 min-[1100px]:grid-cols-[minmax(0,1fr)_380px]">
        <section aria-labelledby="plans-matrix" className="flex flex-col rounded-[30px] border border-border bg-surface px-4 pb-3.5 pt-6 md:px-6">
            <h2 id="plans-matrix" className="m-0 mb-4 font-display text-[25px] font-extrabold tracking-[-0.025em] text-ink">
              {t('plans.matrix.title')}
            </h2>
            <ComparisonMatrix recommended={hit !== null} />
          </section>
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
