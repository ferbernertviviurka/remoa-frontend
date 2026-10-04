'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import type { Entitlements, RedirectUrl } from '@remoa/contracts';
import { t } from '@remoa/strings';
import { Alert, AppNavbar, Avatar, Button, Icon, PlanChip, PlanPopover, type LimitMeterProps } from '@remoa/ui';
import { track } from '@/lib/analytics';
import { api } from '@/lib/api';
import { PLAN_LIMITS } from '@remoa/contracts';
import { initialsOf } from '@/features/account/shell/format';
import { useEntitlements } from './entitlements';
import type { RailIdentity } from './rail';

/** D-109/D-111: the navbar lives on shell routes only; the map editor (`/app/mapas/<id>`) is full-bleed. */
export const showNavbar = (path: string) => !/^\/app\/mapas\/[^/]+/.test(path);

const dateOf = (iso: Date | string) => new Date(iso).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
const meter = (label: string, used: number, limit: number | null): LimitMeterProps => ({
  label,
  used,
  limit,
  value: limit == null ? t('plan.popover.meters.unlimited') : t('plan.popover.meters.value', { used, limit }),
});

export function buildMeters(e: Entitlements): LimitMeterProps[] {
  return [
    meter(t('plan.popover.meters.boards'), e.usage.boards, e.limits.boards),
    meter(t('plan.popover.meters.cards'), e.usage.cards, e.limits.cards),
    meter(t('plan.popover.meters.aiCorrections'), e.usage.ai_grades, e.limits.ai_grades),
    meter(t('plan.popover.meters.pdf'), e.usage.ai_generations, e.limits.ai_generations),
  ];
}
const benefits = [
  { icon: 'maps', lead: t('plan.popover.benefits.unlimited'), text: t('plan.popover.benefits.unlimitedDesc', { maps: PLAN_LIMITS.free.limits.boards ?? 0, cards: PLAN_LIMITS.free.limits.cards ?? 0 }) },
  { icon: 'sparkle', lead: t('plan.popover.benefits.ai'), text: t('plan.popover.benefits.aiDesc') },
  { icon: 'book', lead: t('plan.popover.benefits.pdf'), text: t('plan.popover.benefits.pdfDesc') },
] as const;

export function Navbar({ account = null }: { account?: RailIdentity }) {
  const path = usePathname();
  if (!showNavbar(path)) return null;
  return <NavbarView account={account} />;
}

function NavbarView({ account }: { account: RailIdentity }) {
  const router = useRouter();
  const { entitlements: e, status, refresh } = useEntitlements();
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);
  const founder = e?.plan === 'founder';
  const pro = e?.plan === 'pro' || founder;
  const free = !pro;

  const upgrade = (source: 'navbar_upgrade' | 'plan_popover') => {
    track('upgrade_clicked', { source });
    router.push(`/app/planos?de=${source}`);
  };
  const portal = async () => {
    setBusy(true);
    const r = await api<RedirectUrl>('/v1/billing/portal', { method: 'POST', body: JSON.stringify({}) }).catch(() => null);
    if (r?.ok) return void window.location.assign(r.data.url);
    setBusy(false);
  };
  const retry = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  let alert: ReactNode = null;
  if (e?.graceUntil) alert = <Alert tone="watch" title={t('billing.account.grace', { date: dateOf(e.graceUntil) })} />;
  else if (e && e.limits.boards != null && e.usage.boards > e.limits.boards)
    alert = <Alert tone="watch" title={t('plan.popover.legacy', { n: e.usage.boards, max: e.limits.boards })} />;

  const ctaFree = (
    <Button size="lg" icon={<Icon name="sparkle" size={18} />} onClick={() => upgrade('plan_popover')}>{t('plan.popover.cta')}</Button>
  );

  return (
    <AppNavbar
      home={{ href: '/app/hoje', label: t('nav.wordmark.aria'), as: Link }}
      chip={
        <PlanPopover
          trigger={<PlanChip plan={pro ? 'pro' : 'free'} aria-label={t('nav.planChip.aria')}>{t(founder ? 'nav.planChip.founder' : pro ? 'nav.planChip.pro' : 'nav.planChip.free')}</PlanChip>}
          label={t('nav.planChip.aria')}
          title={t(founder ? 'plan.popover.founder.title' : pro ? 'plan.popover.pro.title' : 'plan.popover.free.title')}
          text={founder ? t('plan.popover.founder.text') : pro ? (e?.renewsAt ? t('plan.popover.pro.renewsAt', { date: dateOf(e.renewsAt) }) : t('plan.popover.pro.text')) : t('plan.popover.free.text')}
          meters={e ? buildMeters(e) : []}
          alert={alert}
          illustration={free ? <Image src="/illustrations/plan-upgrade.svg" width={380} height={150} alt={t('plan.popover.illustration')} /> : undefined}
          benefits={free ? { title: t('plan.popover.benefits.title'), items: benefits } : undefined}
          cta={
            <>
              {free ? ctaFree : founder ? null : <Button variant="secondary" size="lg" loading={busy} onClick={() => void portal()}>{t('plan.popover.pro.manage')}</Button>}
              <Button variant="quiet" size="lg" icon={<Icon name="gift" size={18} />} onClick={() => router.push('/app/indicar?de=plan_panel')}>{t('referral.panelLink')}</Button>
            </>
          }
          state={refreshing ? 'loading' : status === 'error' ? 'error' : 'ready'}
          loadingLabel={t('plan.popover.loading')}
          error={{ message: t('plan.popover.offline'), retryLabel: t('plan.popover.error'), onRetry: () => void retry() }}
          onOpenChange={(open, trigger) => open && track('plan_popover_opened', { trigger })}
        />
      }
      actions={
        <>
          <Button variant="secondary" size="touch" aria-label={t('referral.navCta')} icon={<Icon name="gift" size={18} />} onClick={() => router.push('/app/indicar?de=navbar')}>
            <span className="hidden md:inline">{t('referral.navCta')}</span>
          </Button>
          {free ? <Button size="sm" icon={<Icon name="sparkle" size={18} />} onClick={() => upgrade('navbar_upgrade')}>{t('nav.upgradeButton')}</Button> : null}
          <Link href="/app/conta" aria-label={t('rail.account')} className="flex size-11 items-center justify-center rounded-full">
            <Avatar name={account?.name ?? account?.email ?? ''} fallback={account ? initialsOf(account.name, account.email) : ''} src={account?.src} color={account?.color} size={40} plain />
          </Link>
        </>
      }
    />
  );
}

/** Rail column: under the 64 px navbar it starts below it (D-111). */
export function RailSlot({ children }: { children: ReactNode }) {
  const bar = showNavbar(usePathname());
  return <div className={`sticky hidden md:flex ${bar ? 'top-16 h-[calc(100dvh-4rem)]' : 'top-0 h-dvh'}`}>{children}</div>;
}
