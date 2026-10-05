'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { t } from '@remoa/strings';
import { Dialog, Icon, IconButton } from '@remoa/ui';
import { signOutToLogin } from '@/features/auth/sign-out';
import { openSupport } from '@/features/support/open';
import { PendingLink, useNavPending } from './nav-pending';
import { ACCOUNT_HOME, isActive, items } from './rail';

const row = 'flex min-h-11 w-full items-center gap-3 rounded-[14px] px-3 text-left text-base font-semibold no-underline';

/** Celular: hambúrguer no cabeçalho abre uma folha com todos os destinos do trilho, Conta, Ajuda e Sair. */
export function MobileMenu({ dueTotal = 0, isAdmin = false }: { dueTotal?: number; isAdmin?: boolean }) {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  const { pending } = useNavPending();
  const close = () => setOpen(false);
  const dests = [
    ...items.map((i) => ({ ...i, label: t(i.label) })),
    { href: ACCOUNT_HOME, icon: 'user' as const, label: t('shell.mobileMenu.account') },
    ...(isAdmin ? [{ href: '/admin', icon: 'shield' as const, label: t('admin.navigation.admin') }] : []),
  ];
  return (
    <Dialog
      open={open}
      onOpenChange={setOpen}
      size="full"
      title={t('shell.mobileMenu.title')}
      description={t('shell.mobileMenu.description')}
      closeLabel={t('common.close')}
      trigger={
        <IconButton variant="secondary" aria-label={t('shell.mobileMenu.open')}>
          <Icon name="menu" size={22} />
        </IconButton>
      }
    >
      <nav aria-label={t('pages.navLabel')} className="flex flex-col gap-1 overflow-y-auto">
        {dests.map((d) => {
          const active = isActive(pending ?? path, d.href === ACCOUNT_HOME ? '/app/conta' : d.href, false);
          return (
            <PendingLink key={d.href} href={d.href} onClick={close} aria-current={active ? 'page' : undefined} className={`${row} ${active ? 'bg-primary-tint text-primary-deep' : 'text-ink'}`}>
              <Icon name={d.icon} size={22} />
              <span className="flex-1">{d.label}</span>
              {d.href === '/app/revisar' && dueTotal > 0 ? (
                <span className="flex h-[22px] min-w-[22px] items-center justify-center rounded-pill bg-review px-1.5 text-xs font-bold text-white">
                  <span aria-hidden="true">{dueTotal}</span>
                  <span className="sr-only">{t('review.badge', { n: dueTotal })}</span>
                </span>
              ) : null}
            </PendingLink>
          );
        })}
        <button type="button" aria-haspopup="dialog" onClick={() => { close(); openSupport('mobile_nav'); }} className={`${row} cursor-pointer bg-transparent text-ink`}>
          <Icon name="help" size={22} />
          {t('support.navigation.help')}
        </button>
        <button type="button" onClick={() => void signOutToLogin()} className={`${row} cursor-pointer bg-transparent text-ink`}>
          <Icon name="logout" size={22} />
          {t('auth.signOut')}
        </button>
      </nav>
    </Dialog>
  );
}
