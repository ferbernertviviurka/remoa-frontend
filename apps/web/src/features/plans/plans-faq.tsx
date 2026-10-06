'use client';

import { withStrings } from '@remoa/strings';
import * as more from '@remoa/strings/ns';
import { FaqAccordion } from '@remoa/ui';
import { track } from '@/lib/analytics';

const t = withStrings({ plans: more.plans });

const items = [1, 2, 3, 4].map((i) => {
  const k = `q${i}` as 'q1' | 'q2' | 'q3' | 'q4';
  return { value: k, question: t(`plans.faq.items.${k}.q`), answer: t(`plans.faq.items.${k}.a`) };
});

/** F15 FR-10. Native FaqAccordion (one open at a time); `faq_opened` only fires on expand. */
export function PlansFaq() {
  return (
    <section aria-labelledby="plans-faq" className="flex flex-col rounded-[30px] border border-border bg-surface px-6 pb-2 pt-6">
      <h2 id="plans-faq" className="m-0 mb-2.5 font-display text-[25px] font-extrabold tracking-[-0.025em] text-ink">
        {t('plans.faq.title')}
      </h2>
      <FaqAccordion
        items={items}
        onOpenChange={(v) => {
          if (v) track('faq_opened', { index: items.findIndex((i) => i.value === v) });
        }}
      />
    </section>
  );
}
