'use client';

import { useEffect, type ReactNode } from 'react';
import Link from 'next/link';
import { useSelectedLayoutSegment } from 'next/navigation';
import { accountSections, type AccountSection } from '@remoa/contracts';
import { t } from '@remoa/strings';
import { Alert, Button, Icon, SettingsNav, SettingsNavAction, useToast, type SettingsNavLinkProps } from '@remoa/ui';
import { track } from '@/lib/analytics';
import { api } from '@/lib/api';
import { openSupport } from '@/features/support/open';
import { signOutToLogin } from '@/features/auth/sign-out';
import { PhotoDialogProvider } from '../profile/photo-dialog';
import { AccountHero } from './account-hero';
import { useAccount } from './account-context';
import { formatDay } from './format';
import { NavIcon } from './nav-icons';
import { useOnline } from './use-online';

const NavLink = ({ children, ...p }: SettingsNavLinkProps) => <Link {...p}>{children}</Link>;

function DeletionBanner({ at }: { at: Date | string }) {
  const { refresh } = useAccount();
  const { toast } = useToast();
  const online = useOnline();
  async function cancel() {
    try {
      const r = await api('/v1/account/deletion/cancel', { method: 'POST' });
      if (!r.ok) throw new Error(r.error.code);
      track('deletion_canceled', {});
      await refresh();
      toast({ title: t('account.deletionBanner.canceled') });
    } catch {
      toast({ title: t('account.genericError'), tone: 'danger' });
    }
  }
  return (
    <Alert tone="review" title={t('account.deletionBanner.text', { date: formatDay(at) })}>
      <Button variant="secondary" size="sm" disabled={!online} onClick={cancel}>
        {t('account.deletionBanner.cancel')}
      </Button>
    </Alert>
  );
}

/**
 * email_change_confirmed / identity_linked happen outside the app (mail link, Google redirect), so they are detected by
 * comparing the snapshot with the last one this browser saw. Flags only, never the address.
 */
function useAccountTransitions() {
  const { account } = useAccount();
  const pending = !!account.pendingEmail;
  const google = account.identities.some((i) => i.provider === 'google');
  useEffect(() => {
    try {
      const key = `remoa-account-seen:${account.profile.userId ?? ''}`;
      const prev = JSON.parse(localStorage.getItem(key) ?? 'null') as { pending: boolean; google: boolean } | null;
      if (prev?.pending && !pending && account.emailConfirmed) track('email_change_confirmed', {});
      if (prev && !prev.google && google) track('identity_linked', { provider: 'google' });
      localStorage.setItem(key, JSON.stringify({ pending, google }));
    } catch {
      /* private mode: the event is skipped */
    }
  }, [pending, google, account.emailConfirmed, account.profile.userId]);
}

/** Banner, hero and subnav live in the layout, so switching sections never remounts them (FR-1). */
export function AccountShell({ children }: { children: ReactNode }) {
  const { account } = useAccount();
  const { toast } = useToast();
  const online = useOnline();
  const segment = useSelectedLayoutSegment();
  useAccountTransitions();
  const current = (accountSections as readonly string[]).includes(segment ?? '') ? (segment as AccountSection) : null;

  const items = accountSections.map((id) => ({
    id,
    href: `/app/conta/${id}`,
    label: t(`account.nav.${id}`),
    icon: <NavIcon section={id} />,
    current: id === current,
    chipTone: account.entitlements.plan !== 'free' ? ('primary' as const) : ('neutral' as const),
    chip: id === 'plano' ? t(`billing.plan.${account.entitlements.plan}`) : undefined,
  }));

  return (
    <PhotoDialogProvider>
      <div className="flex w-full max-w-[1280px] flex-col gap-6 md:-m-6 md:w-[calc(100%+3rem)] md:max-w-[1280px] md:px-12 md:pb-14 md:pt-8">
        {account.deletionScheduledFor ? <DeletionBanner at={account.deletionScheduledFor} /> : null}
        {online ? null : <Alert tone="watch" title={t('account.offline')} />}
        <AccountHero />
        <div className="grid items-start gap-7 md:grid-cols-[248px_minmax(0,1fr)]">
          <SettingsNav
            label={t('account.nav.label')}
            items={items}
            linkComponent={NavLink}
            footer={
              <>
              <SettingsNavAction icon={<Icon name="help" size={20} />} onClick={() => openSupport('account_menu')}>
                {t('support.navigation.talkToSupport')}
              </SettingsNavAction>
              <SettingsNavAction
                icon={<Icon name="logout" size={20} />}
                onClick={async () => {
                  if (!(await signOutToLogin())) toast({ title: t('account.genericError'), tone: 'danger' });
                }}
              >
                {t('account.nav.signOut')}
              </SettingsNavAction>
              </>
            }
          />
          {children}
        </div>
      </div>
    </PhotoDialogProvider>
  );
}
