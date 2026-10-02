'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { useRouter, useSelectedLayoutSegment } from 'next/navigation';
import { accountSections, type AccountSection } from '@remoa/contracts';
import { t } from '@remoa/strings';
import { Alert, Button, Icon, SettingsNav, SettingsNavAction, useToast, type SettingsNavLinkProps } from '@remoa/ui';
import { track } from '@/lib/analytics';
import { api } from '@/lib/api';
import { signOut } from '@/server/auth/actions';
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

/** Banner, hero and subnav live in the layout, so switching sections never remounts them (FR-1). */
export function AccountShell({ children }: { children: ReactNode }) {
  const { account } = useAccount();
  const router = useRouter();
  const online = useOnline();
  const segment = useSelectedLayoutSegment();
  const current = (accountSections as readonly string[]).includes(segment ?? '') ? (segment as AccountSection) : null;

  const items = accountSections.map((id) => ({
    id,
    href: `/conta/${id}`,
    label: t(`account.nav.${id}`),
    icon: <NavIcon section={id} />,
    current: id === current,
    chipTone: account.entitlements.plan === 'pro' ? ('primary' as const) : ('neutral' as const),
    chip: id === 'plano' ? t(account.entitlements.plan === 'pro' ? 'billing.plan.pro' : 'billing.plan.free') : undefined,
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
              <SettingsNavAction
                icon={<Icon name="logout" size={20} />}
                onClick={async () => {
                  const res = await signOut();
                  if (res.ok) {
                    router.push('/');
                    router.refresh();
                  }
                }}
              >
                {t('account.nav.signOut')}
              </SettingsNavAction>
            }
          />
          {children}
        </div>
      </div>
    </PhotoDialogProvider>
  );
}
