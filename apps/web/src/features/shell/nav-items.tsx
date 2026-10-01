import type { ReactNode } from 'react';
import type { StringKey } from '@remoa/strings';
import { AccountIcon, CoverageIcon, MapIcon, ReviewIcon, StoreIcon } from './icons';

export type NavItem = { href: string; label: StringKey; short: StringKey; icon: ReactNode; bottom: boolean };

export const navItems: NavItem[] = [
  { href: '/mapas', label: 'shell.nav.boards', short: 'shell.bottomNav.boards', icon: <MapIcon />, bottom: true },
  { href: '/revisar', label: 'shell.nav.review', short: 'shell.bottomNav.review', icon: <ReviewIcon />, bottom: true },
  { href: '/cobertura', label: 'shell.nav.coverage', short: 'shell.bottomNav.coverage', icon: <CoverageIcon />, bottom: true },
  { href: '/loja', label: 'shell.nav.store', short: 'shell.nav.store', icon: <StoreIcon />, bottom: false },
  { href: '/conta', label: 'shell.nav.account', short: 'shell.bottomNav.account', icon: <AccountIcon />, bottom: true },
];
