'use client';

import { useEffect } from 'react';
import type { AccountSection } from '@remoa/contracts';
import { track } from '@/lib/analytics';
import { DataSection } from '../data/data-section';
import { PlanSection } from '../plan/plan-section';
import { PreferencesSection } from '../preferences/preferences-section';
import { ProfileSection } from '../profile/profile-section';
import { SecuritySection } from '../security/security-section';

const sections = { perfil: ProfileSection, seguranca: SecuritySection, plano: PlanSection, preferencias: PreferencesSection, dados: DataSection } as const;

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
