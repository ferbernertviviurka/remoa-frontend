'use client';

import { t } from '@remoa/strings/referral';
import { ReferralHero } from '@remoa/ui';

/** FR-3. O título vem de uma string só ("… {span}1 mês de Pro{/span}."): o trecho marcado ganha a barra desenhada. */
export function HeroSection() {
  const [before = '', rest = ''] = t('referral.hero.title').split('{span}');
  const [highlight = '', after = ''] = rest.split('{/span}');
  return (
    <ReferralHero
      eyebrow={t('referral.hero.label')}
      titleBefore={before}
      titleHighlight={`${highlight}${after}`}
      subtitle={t('referral.hero.subtitle')}
      primary={{ label: t('referral.hero.ctaPrimary'), href: '#compartilhar' }}
      secondary={{ label: t('referral.hero.ctaSecondary'), href: '#como' }}
      art={{ you: t('referral.map.youLabel'), friend: t('referral.page.friendLabel'), reward: t('referral.page.heroReward'), badge: t('referral.page.badge') }}
    />
  );
}
