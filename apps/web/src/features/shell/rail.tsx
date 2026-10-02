'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { t, type StringKey } from '@remoa/strings';
import { AppRail, Logo, RailAccount, RailItem, type IconName } from '@remoa/ui';

const items: { href: string; icon: IconName; label: StringKey }[] = [
  { href: '/', icon: 'home', label: 'rail.home' },
  { href: '/mapas', icon: 'maps', label: 'rail.maps' },
  { href: '/revisar', icon: 'bolt', label: 'rail.review' },
  { href: '/cobertura', icon: 'bars', label: 'rail.enamed' },
  { href: '/loja', icon: 'store', label: 'rail.store' },
];

// O middleware reescreve `/` → `/hoje` sem mudar a URL, então o Hoje aparece como `/` (ou `/hoje` em acesso direto).
const isActive = (path: string, href: string, challenge: boolean) =>
  href === '/' ? path === '/' || path === '/hoje' : challenge ? href === '/revisar' : path === href || path.startsWith(`${href}/`);

/** Trilho de 88 px (D-076). `dueTotal` = badge do Revisar. */
export function Rail({ dueTotal = 0 }: { dueTotal?: number }) {
  const path = usePathname();
  const router = useRouter();
  // G01 T6: the challenge lives in the map (`/mapas/<id>?modo=desafio`) but belongs to Revisar (Desafio.dc.html)
  const modo = useSearchParams().get('modo');
  const challenge = path.startsWith('/mapas/') && modo === 'desafio';
  return (
    <AppRail
      aria-label={t('pages.navLabel')}
      logo={
        <Link href="/" aria-label={t('pages.logoLink')}>
          <Logo size={36} />
        </Link>
      }
      account={<RailAccount aria-label={t('rail.account')} onClick={() => router.push('/conta')} />}
    >
      {items.map((i) => (
        <RailItem
          key={i.href}
          as={Link}
          href={i.href}
          icon={i.icon}
          label={t(i.label)}
          active={isActive(path, i.href, challenge)}
          {...(i.href === '/revisar' && dueTotal > 0 ? { badge: dueTotal, badgeLabel: t('review.badge', { n: dueTotal }) } : {})}
        />
      ))}
    </AppRail>
  );
}
