'use client';

import type { CSSProperties } from 'react';
import { t } from '@remoa/strings/landing';
import { Icon, buttonVariants, focusRing, pressable } from '@remoa/ui';
import { track } from '@/lib/analytics';
import type { LaunchPhase } from '../flags';

const base = `inline-flex h-[60px] items-center justify-center gap-2.5 rounded-[18px] text-[18px] no-underline max-sm:w-full ${pressable} ${focusRing}`;

/** FR-3: "Criar meu primeiro mapa" → /cadastro when open, else the waitlist (#cta); "Experimentar um desafio" → #experimente. */
export function HeroCtas({ launchPhase }: { launchPhase: LaunchPhase }) {
  return (
    <div className="hx-in mt-1.5 flex w-full flex-col items-center justify-center gap-3.5 sm:w-auto sm:flex-row" style={{ '--d': '.4s' } as CSSProperties}>
      <a href={launchPhase === 'open' ? '/cadastro' : '#cta'} onClick={() => track('hero_cta_clicked', { cta: 'create' })} className={`${base} ${buttonVariants.primary} px-[30px] font-extrabold!`}>
        {t('landing.hero.cta.primary')}
        <Icon name="right" size={22} />
      </a>
      <a href="#experimente" onClick={() => track('hero_cta_clicked', { cta: 'demo' })} className={`${base} ${buttonVariants.secondary} px-[26px]`}>
        <Icon name="bolt" size={22} />
        {t('landing.hero.cta.secondary')}
      </a>
    </div>
  );
}
