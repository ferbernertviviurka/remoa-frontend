'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { t } from '@remoa/strings/landing';
import { trackCta } from '../analytics';
import { Avatar, Logo, SiteHeader } from '@remoa/ui';
import { initialsOf } from '@/features/account/shell/format';
import type { LaunchPhase } from '../flags';

const ANCHORS = [
  ['como-funciona', 'landing.nav.anchors.howWorks'],
  ['recursos', 'landing.nav.anchors.features'],
  ['planos', 'landing.nav.anchors.plans'],
  ['faq', 'landing.nav.anchors.faq'],
] as const;

const btn = 'inline-flex min-h-11 items-center justify-center rounded-[14px] px-4 text-[15px] font-bold no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary';

/** FR-2: sticky header; active anchor = the last section whose top crossed the upper third of the viewport (P1). */
export type HeaderAccount = { name: string | null; email: string; color?: number; src?: string };

/** `signedIn` (D-320): who already has a session gets one CTA back into the app instead of "Entrar", plus the avatar (links to the account). */
export function LandingHeader({ phase, signedIn = false, account }: { phase: LaunchPhase; signedIn?: boolean; account?: HeaderAccount | null }) {
  const [active, setActive] = useState('');
  useEffect(() => {
    const els = ANCHORS.map(([id]) => document.getElementById(id)).filter((e): e is HTMLElement => !!e);
    if (!els.length || typeof IntersectionObserver === 'undefined') return;
    // The observer only wakes us up when a section crosses the band; the choice is the last section whose top passed the line.
    const pick = () => {
      const line = 92 + window.innerHeight * 0.25;
      setActive([...els].reverse().find((e) => e.getBoundingClientRect().top <= line && e.getBoundingClientRect().bottom > line)?.id ?? '');
    };
    const io = new IntersectionObserver(pick, { rootMargin: '-92px 0px -70% 0px', threshold: [0, 1] });
    els.forEach((e) => io.observe(e));
    pick();
    return () => io.disconnect();
  }, []);

  return (
    <SiteHeader
      brand={<Link href="/" aria-label={t('landing.nav.wordmark.aria')} className="inline-flex min-h-11 items-center no-underline"><Logo size={30} withWordmark /></Link>}
      links={ANCHORS.map(([id, key]) => ({ href: `#${id}`, label: t(key), active: active === id }))}
      menuLabel={t('landing.nav.menu.aria')}
      navLabel={t('landing.nav.navLabel')}
      actions={signedIn ? <>
        <Link href="/app" onClick={trackCta('header', 'open_app')} className={`${btn} bg-primary text-on-primary hover:brightness-110`}>{t('landing.nav.openApp')}</Link>
        {account ? (
          <Link href="/app/conta" aria-label={t('landing.nav.account')} className="flex size-11 shrink-0 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
            <Avatar name={account.name ?? account.email} fallback={initialsOf(account.name, account.email)} src={account.src} color={account.color} size={40} plain />
          </Link>
        ) : null}
      </> : <>
        <Link href="/entrar" onClick={trackCta('header', 'signin')} className={`${btn} border border-border-strong bg-surface text-ink hover:border-primary`}>{t('landing.nav.signIn')}</Link>
        <a href={phase === 'open' ? '/cadastro' : '#cta'} onClick={trackCta('header', phase === 'open' ? 'create' : 'waitlist')} className={`${btn} bg-primary text-on-primary hover:brightness-110`}>{t('landing.nav.createMap')}</a>
      </>}
    />
  );
}
