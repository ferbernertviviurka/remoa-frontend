'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { t } from '@remoa/strings';
import { AdminSidebar, type AdminNavItem } from '@remoa/ui';
import { signOutToLogin } from '@/features/auth/sign-out';
import { initialsOf } from '@/features/account/shell/format';

const items = (openTickets: number): AdminNavItem[] => [
  { id: 'overview', href: '/admin', icon: 'grid', label: t('admin.overview.label') },
  { id: 'usuarios', href: '/admin/usuarios', icon: 'users', label: t('admin.users.label') },
  { id: 'mapas', href: '/admin/mapas', icon: 'maps', label: t('admin.maps.label') },
  { id: 'transacoes', href: '/admin/transacoes', icon: 'store', label: t('admin.payments.label') },
  { id: 'lista-de-espera', href: '/admin/lista-de-espera', icon: 'mail', label: t('admin.waitlist.label') },
  { id: 'indicacoes', href: '/admin/indicacoes', icon: 'gift', label: t('admin.referrals.label') },
  { id: 'suporte', href: '/admin/suporte', icon: 'lifebuoy', label: t('admin.support.label'), ...(openTickets > 0 ? { badge: openTickets, badgeLabel: t('admin.shell.openTicketsLabel', { n: openTickets }) } : {}) },
  { id: 'blog', href: '/admin/blog', icon: 'pencil', label: t('adminBlog.navigation.blog') },
  { id: 'auditoria', href: '/admin/auditoria', icon: 'audit', label: t('admin.audit.label') },
];

/** Left bar of every /admin page; the active item comes from the URL (first segment after /admin). */
export function AdminNav({ openTickets, name, email }: { openTickets: number; name: string | null; email: string }) {
  const seg = usePathname().split('/')[2];
  // D-320: same local logout as the app; /entrar bounces signed-in users, so sign out first.
  const leave = () => void signOutToLogin();
  return (
    <AdminSidebar
      aria-label={t('admin.navigation.ariaLabel')}
      brandLabel={t('admin.navigation.brand')}
      badge={t('admin.navigation.sealBadge')}
      items={items(openTickets)}
      activeId={seg ?? 'overview'}
      account={{ initial: initialsOf(name, email), name: name ?? t('admin.shell.adminName'), email }}
      backLabel={t('admin.navigation.backToApp')}
      backHref="/app/hoje"
      signOutLabel={t('admin.navigation.signOut')}
      onSignOut={leave}
      as={Link}
    />
  );
}
