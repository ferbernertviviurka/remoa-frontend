'use client';

import { useEffect, useRef } from 'react';
import { referralEntryPoints } from '@remoa/contracts';
import { t } from '@remoa/strings/referral';
import { Button, SkeletonBlock, SkeletonRegion } from '@remoa/ui';
import { track } from '@/lib/analytics';
import './referral.css';
import { FriendsSection } from './map/friends-section';
import { HowItWorks } from './reward/how-it-works';
import { useReferral } from './reward/referral-provider';
import { RewardNotice } from './reward/reward-notice';
import { RewardCard } from './reward/reward-card';
import { Rules } from './reward/rules';
import { HeroSection } from './share/hero-section';
import { LinkCard } from './share/link-card';

type From = (typeof referralEntryPoints)[number];
/** `?de=` não é confiável: o que não está na lista do contrato vira `direct`. */
export const parseFrom = (de: string | undefined): From => ((referralEntryPoints as readonly string[]).includes(de ?? '') ? (de as From) : 'direct');

/** F18 /app/indicar: herói, cartão do link (esquerda) e "Seu Pro grátis" (direita, fixo no desktop), como funciona, mapa e lista, regras. */
export function ReferralView({ from }: { from?: string }) {
  const { summary, status, reload, watch, pulse, notice, dismissNotice } = useReferral();
  const sent = useRef(false);

  useEffect(() => watch(), [watch]);
  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    track('referral_page_viewed', { from: parseFrom(from) });
  }, [from]);

  const loading = !summary && status !== 'error';
  return (
    <div className="mx-auto flex w-full max-w-[1304px] flex-col gap-8 md:px-6 md:py-2">
      <RewardNotice variant="banner" name={notice} onClose={dismissNotice} />
      <HeroSection />
      {!summary && status === 'error' ? (
        <div role="alert" className="flex flex-col items-start gap-3 rounded-[34px] border border-border bg-surface p-[30px]">
          <p className="m-0 font-bold">{t('referral.page.loadError')}</p>
          <Button onClick={() => void reload()}>{t('referral.page.retry')}</Button>
        </div>
      ) : (
        <div className="grid items-start gap-7 min-[1100px]:grid-cols-[minmax(0,1fr)_380px]">
          {summary ? (
            <LinkCard link={summary.link} invitesLeftToday={summary.invitesLeftToday} onSent={() => void reload()} />
          ) : (
            <SkeletonRegion label={t('referral.errors.loading')}><SkeletonBlock height={640} radius={34} /></SkeletonRegion>
          )}
          <div className="min-[1100px]:sticky min-[1100px]:top-6">
            <RewardCard summary={summary} pulse={pulse} loading={loading} />
          </div>
        </div>
      )}
      <HowItWorks />
      <FriendsSection friends={summary?.friends ?? []} loading={loading} />
      <Rules />
    </div>
  );
}
