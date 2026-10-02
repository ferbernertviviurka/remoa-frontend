'use client';

import { useState } from 'react';
import { strings, t } from '@remoa/strings';
import { FeatureExplorer, Section, type FeatureItem } from '@remoa/ui';
import type { LandingFlags } from '../flags';
import { track } from '@/lib/analytics';
import { RevealFallback } from './use-reveal-fallback';

/** ids match the `feature_tab_selected` enum in contracts. */
export const FEATURE_IDS = ['map', 'cards', 'challenge', 'grading', 'fsrs', 'enamed'] as const;
const FILES = ['mapa', 'cards', 'desafio', 'correcao', 'fsrs', 'enamed'];

export function FeaturesSection({ flags }: { flags?: Partial<LandingFlags> }) {
  const approved = !!flags?.approvedContent;
  const [active, setActive] = useState<string>(FEATURE_IDS[0]);
  const items: FeatureItem[] = strings.landing.explorer.items.map((it, i) => {
    const id = FEATURE_IDS[i]!;
    return { id, title: it.title, description: id === 'grading' ? (approved ? strings.landing.grading.textApproved : strings.landing.grading.text) : it.description, benefits: [...(id === 'grading' && approved && 'benefitsApproved' in it ? it.benefitsApproved : it.benefits)], image: { src: `/landing/feat-${FILES[i]}.svg`, alt: id === 'grading' && approved ? strings.landing.featureAlts.gradingApproved : strings.landing.featureAlts[id], width: 640, height: 420 } };
  });
  return (
    <Section id="recursos" tone="dark" eyebrow={t('landing.nav.anchors.features')} title={t('landing.explorer.title')} lead={t('landing.explorer.lead')}>
      <RevealFallback />
      <FeatureExplorer
        items={items}
        activeId={active}
        tablistLabel={t('landing.explorer.tablistAria')}
        onChange={(id) => {
          setActive(id);
          track('feature_tab_selected', { feature: id as (typeof FEATURE_IDS)[number] });
        }}
      />
      <p className="m-0 text-sm font-semibold text-on-dark-muted md:pl-[calc(5/11*100%+3rem)]">{t('landing.explorer.caption', { tab: items.find((i) => i.id === active)?.title.toLowerCase() ?? '' })}</p>
    </Section>
  );
}
