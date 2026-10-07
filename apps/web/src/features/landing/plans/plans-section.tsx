'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { planDefinition } from '@remoa/contracts';
import { TRIAL_DAYS } from '@remoa/contracts/constants';
import type { LandingPriceBook } from '../shell/pricebook';
import { format, strings, t } from '@remoa/strings/landing';
import { PlanCards, Section, formatBRL, type PlanCardPeriod } from '@remoa/ui';
import { track } from '@/lib/analytics';
import { trackCta } from '../analytics';
import type { LandingFlags } from '../flags';

const num = (n: number | null) => (n ?? 0).toLocaleString('pt-BR');
/** null = ilimitado: a palavra concorda com o gênero da linha. */
const orUnlimited = (n: number | null, gender: 'unlimitedF' | 'unlimitedM') => (n === null ? t(`landing.plans.limit.${gender}`) : num(n));

export type PlansSectionProps = { priceBook: LandingPriceBook; flags: Pick<LandingFlags, 'launchPhase' | 'betaFounder' | 'approvedContent'> };
type PlanLimits = ReturnType<typeof planDefinition>;
/** Computed on the server by `PlansSection` (plans.tsx), so this client island does not ship `@remoa/contracts` + zod (D-535). */
export type PlanFacts = { free: PlanLimits; pro: PlanLimits; discountPercent: number; monthlyEquivalent: number };

/** Planos (FR-12): limites de `planDefinition`, preços do `priceBook` (centavos), nenhum número fixo aqui. */
export function PlansSectionView({ priceBook, flags, facts }: PlansSectionProps & { facts: PlanFacts }) {
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

  const { free, pro, discountPercent: pct } = facts;
  const annual = period === 'annual';
  const open = flags.launchPhase === 'open';
  const href = open ? '/cadastro' : '#cta';

  const freeVars = { maps: num(free.boards), cards: num(free.cards), aiCorrections: num(free.ai_grades), pdfMaps: free.ai_generations ?? 0, ankiImports: free.anki_imports ?? 0, ankiCards: num(free.anki_import_cards), dailyNewCards: num(free.new_cards_per_day) };
  const freeFeatures = strings.landing.plans.free.features.map((f) => format(f, freeVars));
  // D-236: `featuresApproved` (strings) replaces the default list only with the approved-content flag; same placeholders.
  const proStrings: { features: readonly string[]; featuresApproved?: readonly string[] } = strings.landing.plans.pro;
  const proVars = {
    aiCorrections: num(pro.ai_grades),
    pdfMaps: num(pro.ai_generations),
    ankiPro: pro.anki_import_cards === null ? t('landing.plans.limit.unlimitedF') : t('landing.plans.limit.upTo', { n: num(pro.anki_import_cards) }),
    dailyNewCardsPro: orUnlimited(pro.new_cards_per_day, 'unlimitedM'),
  };
  const proFeatures = (flags.approvedContent && proStrings.featuresApproved ? proStrings.featuresApproved : proStrings.features).map((f) => format(f, proVars));

  const founderFeatures = [...strings.landing.plans.founder.features];

  return (
    <Section id="planos" tone="surface" eyebrow={t('landing.plans.eyebrow')} title={t('landing.plans.title')}>
      <div ref={ref} className="flex flex-col gap-8">
        <PlanCards
          period={period}
          onPeriodChange={(p) => { if (p !== period) { setPeriod(p); track('pricing_toggled', { period: p }); } }}
          periodLabels={{ monthly: t('landing.plans.period.monthly'), annual: t('landing.plans.period.annual') }}
          periodGroupLabel={t('landing.plans.periodGroupLabel')}
          discountLabel={pct > 0 ? `-${pct}%` : undefined}
          plans={[
            { name: t('landing.plans.free.name'), price: { amount: 0, currency: 'BRL' }, cadence: '', description: t('landing.plans.free.description'), features: freeFeatures,
              note: open ? t('landing.plans.free.trial', { days: TRIAL_DAYS }) : undefined, noteStatic: true,
              cta: <Link href={href} onClick={trackCta('plans_free', open ? 'create' : 'waitlist')} className="border-[1.5px] border-border-strong bg-surface text-ink">{t('landing.plans.cta.free')}</Link> },
            { name: t('landing.plans.pro.name'), dark: true, features: proFeatures,
              price: { amount: (annual ? priceBook.annual.amount : priceBook.monthly.amount) / 100, currency: 'BRL' },
              cadence: t(annual ? 'landing.plans.cadence.annual' : 'landing.plans.cadence.monthly'),
              note: annual ? t('landing.plans.notes.annual', { price: formatBRL(facts.monthlyEquivalent / 100) }) : t('landing.plans.notes.monthly'),
              badge: flags.betaFounder ? t('landing.plans.pro.founder') : undefined,
              cta: <Link href={href} onClick={trackCta('plans_pro', open ? 'create' : 'waitlist')} className="bg-on-dark text-panel-dark">{open ? t('landing.plans.cta.pro') : t('landing.plans.cta.waitlist')}</Link> },
            ...(priceBook.lifetime ? [{ name: t('landing.plans.founder.name'), features: founderFeatures, description: t('landing.plans.founder.description'),
              price: { amount: priceBook.lifetime.amount / 100, currency: 'BRL' as const }, // one-time: independent of the monthly/annual toggle
              cadence: t('landing.plans.cadence.founder'), note: t('landing.plans.notes.founder'),
              cta: <Link href={href} onClick={trackCta('plans_founder', open ? 'create' : 'waitlist')} className="border-[1.5px] border-border-strong bg-surface text-ink">{open ? t('landing.plans.cta.founder') : t('landing.plans.cta.waitlist')}</Link> }] : []),
          ]}
        />
        <p className="m-0 text-center text-[15px] text-muted">{t('landing.plans.footer')}</p>
      </div>
    </Section>
  );
}
