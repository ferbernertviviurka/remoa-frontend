'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { annualDiscountPercent, monthlyEquivalent, planDefinition, type PublicPriceBook } from '@remoa/contracts';
import { strings, t } from '@remoa/strings';
import { PlanCards, Section, formatBRL, type PlanCardPeriod } from '@remoa/ui';
import { track } from '@/lib/analytics';
import type { LandingFlags } from '../flags';
import { plansCopy } from './copy';

const num = (n: number | null) => (n ?? 0).toLocaleString('pt-BR');

export type PlansSectionProps = { priceBook: PublicPriceBook; flags: Pick<LandingFlags, 'launchPhase' | 'betaFounder' | 'approvedContent'> };

/** Planos (FR-12): limites de `planDefinition`, preços do `priceBook` (centavos), nenhum número fixo aqui. */
export function PlansSection({ priceBook, flags }: PlansSectionProps) {
  const [period, setPeriod] = useState<PlanCardPeriod>('monthly');
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver((es) => {
      if (es.some((e) => e.isIntersecting)) { track('pricing_viewed', {}); io.disconnect(); }
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const free = planDefinition('free');
  const pro = planDefinition('pro');
  const annual = period === 'annual';
  const pct = annualDiscountPercent(priceBook);
  const open = flags.launchPhase === 'open';
  const href = open ? '/cadastro' : '#cta';

  const freeFeatures = [
    t('landing.plans.free.features.0', { maps: num(free.boards) }),
    t('landing.plans.free.features.1', { cards: num(free.cards) }),
    t('landing.plans.free.features.2', { aiCorrections: num(free.ai_grades) }),
    t('landing.plans.free.features.3', { pdfMaps: num(free.ai_generations) }),
    t('landing.plans.free.features.4', { ankiCards: num(free.anki_import_cards) }),
    t('landing.plans.free.features.5', { dailyNewCards: num(free.new_cards_per_day) }),
  ];
  // D-236: `featuresApproved` (strings) replaces the default list only with the approved-content flag; same placeholders.
  const proStrings: { features: readonly string[]; featuresApproved?: readonly string[] } = strings.landing.plans.pro;
  const vars = { pdfMaps: num(pro.ai_generations), ankiCardsProto: num(pro.anki_import_cards), dailyNewCardsPro: num(pro.new_cards_per_day) };
  const proFeatures = (flags.approvedContent && proStrings.featuresApproved ? proStrings.featuresApproved : proStrings.features).map((f) => f.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? vars[k as keyof typeof vars] : m)));

  return (
    <Section id="planos" tone="surface" eyebrow={plansCopy.eyebrow} title={t('landing.plans.title')}>
      <div ref={ref} className="flex flex-col gap-8">
        <PlanCards
          period={period}
          onPeriodChange={(p) => { if (p !== period) { setPeriod(p); track('pricing_toggled', { period: p }); } }}
          periodLabels={{ monthly: t('landing.plans.period.monthly'), annual: t('landing.plans.period.annual') }}
          periodGroupLabel={t('landing.plans.periodGroupLabel')}
          discountLabel={pct > 0 ? `-${pct}%` : undefined}
          plans={[
            { name: t('landing.plans.free.name'), price: { amount: 0, currency: 'BRL' }, cadence: '', description: plansCopy.freeDescription, features: freeFeatures,
              cta: <Link href={href} className="border-[1.5px] border-border-strong bg-surface text-ink">{plansCopy.freeCta}</Link> },
            { name: t('landing.plans.pro.name'), dark: true, features: proFeatures,
              price: { amount: (annual ? priceBook.annual.amount : priceBook.monthly.amount) / 100, currency: 'BRL' },
              cadence: annual ? '/ano' : '/mês',
              note: annual ? plansCopy.noteAnnual(formatBRL(monthlyEquivalent(priceBook) / 100)) : plansCopy.noteMonthly,
              badge: flags.betaFounder ? t('landing.plans.pro.founder') : undefined,
              cta: <Link href={href} className="bg-surface text-panel-dark">{open ? plansCopy.proCtaOpen : plansCopy.proCtaWaitlist}</Link> },
          ]}
        />
        <p className="m-0 text-center text-[15px] text-muted">{t('landing.plans.footer')}</p>
      </div>
    </Section>
  );
}
