'use client';

import Link from 'next/link';
import { Suspense } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { t, type StringKey } from '@remoa/strings';
import { useNavPending } from './nav-pending';
import { showNavbar } from './navbar';
import { AppRail, Avatar, Logo, RailAccount, RailItem, type IconName } from '@remoa/ui';
import { initialsOf } from '@/features/account/shell/format';

export const items: { href: string; icon: IconName; label: StringKey }[] = [
  { href: '/app/hoje', icon: 'home', label: 'rail.home' },
  { href: '/app/mapas', icon: 'maps', label: 'rail.maps' },
  { href: '/app/revisar', icon: 'bolt', label: 'rail.review' },
  { href: '/app/cobertura', icon: 'bars', label: 'rail.enamed' },
  { href: '/app/progresso', icon: 'list', label: 'shell.nav.progress' },
  { href: '/app/loja', icon: 'store', label: 'rail.store' },
];

export const isActive = (path: string, href: string, challenge: boolean) =>
  challenge ? href === '/app/revisar' : path === href || path.startsWith(`${href}/`);

/** Trilho de 88 px (D-076). `dueTotal` = badge do Revisar. */
/** F13: who is signed in, for the avatar at the foot of the rail (null = API down, user icon). */
export type RailIdentity = { name: string | null; email: string; color: number; src?: string } | null;

export function Rail({ dueTotal = 0, account = null, isAdmin = false }: { dueTotal?: number; account?: RailIdentity; isAdmin?: boolean }) {
  // useSearchParams sem Suspense derruba o prerender das páginas estáticas no `next build`; o fallback é o mesmo trilho sem `modo`.
  return (
    <Suspense fallback={<RailView dueTotal={dueTotal} account={account} modo={null} isAdmin={isAdmin} />}>
      <RailWithParams dueTotal={dueTotal} account={account} isAdmin={isAdmin} />
    </Suspense>
  );
}

function RailWithParams({ dueTotal, account, isAdmin }: { dueTotal: number; account: RailIdentity; isAdmin: boolean }) {
  return <RailView dueTotal={dueTotal} account={account} isAdmin={isAdmin} modo={useSearchParams().get('modo')} />;
}

function RailView({ dueTotal, account, modo, isAdmin }: { dueTotal: number; account: RailIdentity; modo: string | null; isAdmin: boolean }) {
  const path = usePathname();
  const router = useRouter();
  // G01 T6: the challenge lives in the map (`/app/mapas/<id>?modo=desafio`) but belongs to Revisar (Desafio.dc.html)
  const challenge = path.startsWith('/app/mapas/') && modo === 'desafio';
  // Destaque otimista: o item clicado fica ativo na hora (estado no NavPendingProvider, que limpa ao mudar a rota).
  const { pending, setPending } = useNavPending();
  return (
    <AppRail
      aria-label={t('pages.navLabel')}
      logo={
        showNavbar(path) ? null : (
          <Link href="/app/hoje" aria-label={t('pages.logoLink')}>
            <Logo size={36} />
          </Link>
        )
      }
      account={
        showNavbar(path) ? null : <RailAccount aria-label={t('rail.account')} active={path.startsWith('/app/conta')} onClick={() => router.push('/app/conta')}>
          {account ? <Avatar name={account.name ?? account.email} fallback={initialsOf(account.name, account.email)} src={account.src} color={account.color} size={44} plain /> : null}
        </RailAccount>
      }
    >
      {items.map((i) => (
        <RailItem
          key={i.href}
          as={Link}
          href={i.href}
          icon={i.icon}
          label={t(i.label)}
          active={pending ? pending === i.href : isActive(path, i.href, challenge)}
          onClick={() => !isActive(path, i.href, challenge) && setPending(i.href)}
          {...(i.href === '/app/revisar' && dueTotal > 0 ? { badge: dueTotal, badgeLabel: t('review.badge', { n: dueTotal }) } : {})}
        />
      ))}
      {isAdmin ? <RailItem as={Link} href="/admin" icon="shield" label={t('admin.navigation.admin')} tone="admin" /> : null}
    </AppRail>
  );
}
