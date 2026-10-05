'use client';

import { Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { t, type StringKey } from '@remoa/strings';
import { PendingLink, useNavPending } from './nav-pending';
import { AppRail, RailItem, type IconName } from '@remoa/ui';

export const items: { href: string; icon: IconName; label: StringKey }[] = [
  { href: '/app/hoje', icon: 'home', label: 'rail.home' },
  { href: '/app/mapas', icon: 'maps', label: 'rail.maps' },
  { href: '/app/revisar', icon: 'bolt', label: 'rail.review' },
  { href: '/app/cobertura', icon: 'bars', label: 'rail.enamed' },
  { href: '/app/progresso', icon: 'list', label: 'shell.nav.progress' },
  { href: '/app/loja', icon: 'store', label: 'rail.store' },
];

/** G14 (D-584): the account opens on Perfil directly; `/app/conta` is a server redirect (a second round trip). */
export const ACCOUNT_HOME = '/app/conta/perfil';

export const isActive = (path: string, href: string, challenge: boolean) =>
  challenge ? href === '/app/revisar' : path === href || path.startsWith(`${href}/`);

/** Trilho de 88 px (D-076). `dueTotal` = badge do Revisar. */
/** F13: who is signed in, for the avatar at the foot of the rail (null = API down, user icon). */
export type RailIdentity = { name: string | null; email: string; color: number; src?: string } | null;

/** The account avatar and the logo live in the navbar on every /app screen (D-607). */
export function Rail({ dueTotal = 0, isAdmin = false }: { dueTotal?: number; isAdmin?: boolean }) {
  // useSearchParams sem Suspense derruba o prerender das páginas estáticas no `next build`; o fallback é o mesmo trilho sem `modo`.
  return (
    <Suspense fallback={<RailView dueTotal={dueTotal} modo={null} isAdmin={isAdmin} />}>
      <RailWithParams dueTotal={dueTotal} isAdmin={isAdmin} />
    </Suspense>
  );
}

function RailWithParams({ dueTotal, isAdmin }: { dueTotal: number; isAdmin: boolean }) {
  return <RailView dueTotal={dueTotal} isAdmin={isAdmin} modo={useSearchParams().get('modo')} />;
}

function RailView({ dueTotal, modo, isAdmin }: { dueTotal: number; modo: string | null; isAdmin: boolean }) {
  const path = usePathname();
  // G01 T6: the challenge lives in the map (`/app/mapas/<id>?modo=desafio`) but belongs to Revisar (Desafio.dc.html)
  const challenge = path.startsWith('/app/mapas/') && modo === 'desafio';
  // Destaque otimista: o item clicado fica ativo na hora (estado no NavPendingProvider, que limpa ao mudar a rota).
  const { pending } = useNavPending();
  return (
    <AppRail
      aria-label={t('pages.navLabel')}
    >
      {items.map((i) => (
        <RailItem
          key={i.href}
          as={PendingLink}
          href={i.href}
          icon={i.icon}
          label={t(i.label)}
          active={pending ? isActive(pending, i.href, false) : isActive(path, i.href, challenge)}
          {...(i.href === '/app/revisar' && dueTotal > 0 ? { badge: dueTotal, badgeLabel: t('review.badge', { n: dueTotal }) } : {})}
          {...(i.href === '/app/loja' ? { badge: t('store.soonTag') } : {})}
        />
      ))}
      {isAdmin ? <RailItem as={PendingLink} href="/admin" icon="shield" label={t('admin.navigation.admin')} tone="admin" /> : null}
    </AppRail>
  );
}
