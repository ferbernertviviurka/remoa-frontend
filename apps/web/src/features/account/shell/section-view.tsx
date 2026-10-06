'use client';

import dynamic from 'next/dynamic';
import { useEffect } from 'react';
import type { AccountSection } from '@remoa/contracts';
import { withStrings } from '@remoa/strings';
import * as more from '@remoa/strings/ns';
import { SkeletonBlock as B, SkeletonRegion } from '@remoa/ui';
import { track } from '@/lib/analytics';

const t = withStrings({ account: more.account });

/** Also the route's loading.tsx. */
export function SectionSkeleton() {
  return (
    <SkeletonRegion label={t('account.skeletonLabel')}>
      <div className="flex flex-col gap-6">
        <B height={300} radius={28} />
        <B height={220} radius={28} />
      </div>
    </SkeletonRegion>
  );
}

// P-514 (D-1080): one chunk per section; the page only ships the one in the URL (SSR unchanged, the skeleton shows on client navigation).
const loading = () => <SectionSkeleton />;
const sections = {
  perfil: dynamic(() => import('../profile/profile-section').then((m) => m.ProfileSection), { loading }),
  seguranca: dynamic(() => import('../security/security-section').then((m) => m.SecuritySection), { loading }),
  plano: dynamic(() => import('../plan/plan-section').then((m) => m.PlanSection), { loading }),
  preferencias: dynamic(() => import('../preferences/preferences-section').then((m) => m.PreferencesSection), { loading }),
  dados: dynamic(() => import('../data/data-section').then((m) => m.DataSection), { loading }),
} as const;

/** The section enters with `slide` (keyed by section); hero and subnav stay mounted in the layout. */
export function SectionView({ section }: { section: AccountSection }) {
  useEffect(() => {
    track('account_viewed', { section });
  }, [section]);
  const Section = sections[section];
  return (
    <div key={section} className="slide flex min-w-0 flex-col gap-6">
      <Section />
    </div>
  );
}
