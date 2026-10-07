'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { trackCta } from '../analytics';
import { Avatar, Logo, SiteHeader } from '@remoa/ui';
import { initialsOf } from '@/features/account/shell/format';
import { apiBase } from '@/lib/api/base';
import type { AccountSnapshot } from '@remoa/contracts';
import type { LaunchPhase } from '../flags';
import type { HeaderLabelKey } from './header-labels';

const ANCHORS = [
  ['como-funciona', 'landing.nav.anchors.howWorks'],
  ['recursos', 'landing.nav.anchors.features'],
  ['ia', 'landing.nav.anchors.ia'],
  ['enamed', 'landing.nav.anchors.enamed'],
  ['calendario', 'landing.nav.anchors.calendar'],
  ['planos', 'landing.nav.anchors.plans'],
  ['faq', 'landing.nav.anchors.faq'],
] as const;

const btn = 'inline-flex min-h-11 items-center justify-center rounded-[14px] px-4 text-[15px] font-bold no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary';

/** FR-2: sticky header; active anchor = the last section whose top crossed the upper quarter of the viewport (P1). */
export type HeaderAccount = { name: string | null; email: string; color?: number; src?: string };

/** Supabase SSR session cookie (`sb-<ref>-auth-token`, maybe chunked `.0`/`.1`); not httpOnly. */
export const hasSessionCookie = (cookie: string) => /(?:^|;\s*)sb-[^=;]*-auth-token(?:\.\d+)?=/.test(cookie);

/**
 * D-534: the landing is static, so the session is read here. Visitors without the Supabase cookie never load supabase-js;
 * with it, the client is imported lazily, and a failing /me only hides the avatar.
 */
function useSignedIn() {
  const [state, setState] = useState<{ signedIn: boolean; account: HeaderAccount | null }>({ signedIn: false, account: null });
  useEffect(() => {
    if (!hasSessionCookie(document.cookie)) return;
    let alive = true;
    void (async () => {
      const { createClient } = await import('@/lib/supabase/client');
      const token = (await createClient().auth.getSession()).data.session?.access_token;
      if (!token || !alive) return;
      setState({ signedIn: true, account: null });
      // Plain fetch, not `apiFetch` (D-535: keeps zod out of the landing bundle).
      const r = await fetch(`${apiBase()}/v1/account/me`, { headers: { authorization: `Bearer ${token}` } }).then((x) => (x.ok ? (x.json() as Promise<{ data?: AccountSnapshot }>) : null)).catch(() => null);
      const me = r?.data;
      if (!alive || !me) return;
      setState({ signedIn: true, account: { name: me.profile.name, email: me.email, color: me.profile.avatarColor, src: me.avatarUrls?.small } });
    })();
    return () => { alive = false; };
  }, []);
  return state;
}

/** `signedIn` (D-320): who already has a session gets one CTA back into the app instead of "Entrar", plus the avatar (links to the account). */
/** `blogLabel` comes from the server layout: the client strings subset (D-535) does not carry the blog dictionary. */
export function LandingHeader({ phase, labels, blogLabel, signedIn: signedInProp = false, account: accountProp }: { phase: LaunchPhase; labels: Record<HeaderLabelKey, string>; blogLabel: string; signedIn?: boolean; account?: HeaderAccount | null }) {
  const t = (key: HeaderLabelKey) => labels[key];
  const session = useSignedIn();
  const signedIn = signedInProp || session.signedIn;
  const account = accountProp ?? session.account;
  const [active, setActive] = useState('');
  useEffect(() => {
    // Re-queried on every pick: lazy islands (D-535) swap the section nodes after load, so cached elements would go stale.
    let queued = false;
    const pick = () => {
      queued = false;
      const line = 92 + window.innerHeight * 0.25;
      const els = ANCHORS.map(([id]) => document.getElementById(id)).filter((e): e is HTMLElement => !!e);
      setActive(els.reverse().find((e) => e.getBoundingClientRect().top <= line && e.getBoundingClientRect().bottom > line)?.id ?? '');
    };
    const onScroll = () => { if (!queued) { queued = true; requestAnimationFrame(pick); } };
    window.addEventListener('scroll', onScroll, { passive: true });
    pick();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <SiteHeader
      brand={<Link href={signedIn ? '/app/hoje' : '/'} aria-label={t(signedIn ? 'landing.nav.wordmark.ariaApp' : 'landing.nav.wordmark.aria')} className="inline-flex min-h-11 items-center no-underline"><Logo size={30} withWordmark /></Link>}
      links={[...ANCHORS.map(([id, key]) => ({ href: `/#${id}`, label: t(key), active: active === id })), { href: '/blog', label: blogLabel }]}
      menuLabel={t('landing.nav.menu.aria')}
      navLabel={t('landing.nav.navLabel')}
      actions={signedIn ? <>
        <Link href="/app" onClick={trackCta('header', 'open_app')} className={`${btn} bg-primary text-on-primary hover:brightness-110`}>{t('landing.nav.openApp')}</Link>
        {account ? (
          <Link href="/app/conta/perfil" aria-label={t('landing.nav.account')} className="flex size-11 shrink-0 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
            <Avatar name={account.name ?? account.email} fallback={initialsOf(account.name, account.email)} src={account.src} color={account.color} size={40} plain />
          </Link>
        ) : null}
      </> : <>
        <Link href={phase === 'open' ? '/entrar' : '#cta'} onClick={trackCta('header', phase === 'open' ? 'signin' : 'waitlist')} className={`${btn} border border-border-strong bg-surface text-ink hover:border-primary`}>{t('landing.nav.signIn')}</Link>
        <a href={phase === 'open' ? '/cadastro' : '#cta'} onClick={trackCta('header', phase === 'open' ? 'create' : 'waitlist')} className={`${btn} bg-primary text-on-primary hover:brightness-110`}>{t('landing.nav.createMap')}</a>
      </>}
    />
  );
}
