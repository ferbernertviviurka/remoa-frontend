'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { t } from '@remoa/strings';
import { Logo, SiteHeader } from '@remoa/ui';
import type { LaunchPhase } from '../flags';

const ANCHORS = [
  ['como-funciona', 'landing.nav.anchors.howWorks'],
  ['recursos', 'landing.nav.anchors.features'],
  ['planos', 'landing.nav.anchors.plans'],
  ['faq', 'landing.nav.anchors.faq'],
] as const;

const btn = 'inline-flex min-h-11 items-center justify-center rounded-[14px] px-4 text-[15px] font-bold no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary';

/** FR-2: sticky header; active anchor = the last section whose top crossed the upper third of the viewport (P1). */
export function LandingHeader({ phase }: { phase: LaunchPhase }) {
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
      brand={<Link href="/" aria-label={t('landing.nav.wordmark.aria')} className="no-underline"><Logo size={30} withWordmark /></Link>}
      links={ANCHORS.map(([id, key]) => ({ href: `#${id}`, label: t(key), active: active === id }))}
      menuLabel={t('landing.nav.menu.aria')}
      navLabel={t('landing.nav.navLabel')}
      actions={<>
        <Link href="/entrar" className={`${btn} border border-border-strong bg-surface text-ink hover:border-primary`}>{t('landing.nav.signIn')}</Link>
        <a href={phase === 'open' ? '/cadastro' : '#cta'} className={`${btn} bg-primary text-on-primary hover:brightness-110`}>{t('landing.nav.createMap')}</a>
      </>}
    />
  );
}
