'use client';

import type { ComponentType, ReactNode } from 'react';
import { clsx } from 'clsx';
import { focusRing } from './button';
import { Icon, type IconName } from './icons';

/**
 * AppRail: trilho de navegação de 88 px (fundo --surface, borda direita). `<nav aria-label>` obrigatório.
 * `logo` (ReactNode, normalmente <a aria-label="Remoa, ir para Hoje"><Logo size={36}/></a>) no topo; `children` = <RailItem/>s;
 * `account` (ReactNode, ex.: <RailAccount/>) no rodapé.
 * RailItem: 68 × 64, raio 18, ícone 24 + rótulo 12 px. `icon` (IconName), `label`, `active` (tint + texto deep + 700, `aria-current="page"`),
 * `badge` (número/texto no canto, laranja --review; `badgeLabel` = texto só para leitor de tela, ex.: "12 revisões vencidas").
 * Com `href` vira link (`as` troca o elemento, ex.: next/link); sem `href` é <button>.
 */
/** `logo` null/undefined = no logo box at all (F14: the navbar carries the brand on shell routes). */
export type AppRailProps = { 'aria-label': string; logo?: ReactNode; children: ReactNode; account?: ReactNode };

export function AppRail({ logo, children, account, ...rest }: AppRailProps) {
  return (
    <nav {...rest} className={clsx('flex w-[88px] shrink-0 flex-col items-center gap-1.5 border-r border-border bg-surface pb-[18px]', logo ? 'pt-4' : 'pt-6')}>
      {logo ? (
        <>
          <div className="flex size-14 items-center justify-center rounded-[18px]">{logo}</div>
          <span aria-hidden="true" className="h-3" />
        </>
      ) : null}
      {children}
      <span aria-hidden="true" className="grow" />
      {account}
    </nav>
  );
}

type LinkLike = ComponentType<{ href: string; 'aria-current'?: 'page'; className?: string; children?: ReactNode; onClick?: () => void }> | 'a';

export type RailItemProps = {
  icon: IconName;
  label: string;
  active?: boolean;
  badge?: number | string;
  badgeLabel?: string;
  href?: string;
  as?: LinkLike;
  onClick?: () => void;
  /** `admin` (F19 FR-11): light-orange background; only rendered for admins. */
  tone?: 'admin';
};

export function RailItem({ icon, label, active = false, badge, badgeLabel, href, as, onClick, tone }: RailItemProps) {
  const cls = clsx(
    'relative flex h-16 w-[68px] flex-col items-center justify-center gap-1 rounded-[18px] border-0 text-xs no-underline transition-colors duration-150',
    tone === 'admin'
      ? clsx('bg-review-bg text-review-text hover:brightness-95', active ? 'font-bold' : 'font-semibold')
      : active ? 'bg-primary-tint font-bold text-primary-deep' : 'bg-transparent font-semibold text-muted hover:bg-primary-tint/60',
    focusRing,
  );
  const inner = (
    <>
      <Icon name={icon} />
      <span>{label}</span>
      {badge != null ? (
        <span className="absolute right-[9px] top-1.5 flex h-5 min-w-5 items-center justify-center rounded-pill bg-review px-1.5 text-[11px] font-bold text-white">
          <span aria-hidden={badgeLabel ? true : undefined}>{badge}</span>
          {badgeLabel ? <span className="sr-only">{badgeLabel}</span> : null}
        </span>
      ) : null}
    </>
  );
  if (href != null) {
    const As: LinkLike = as ?? 'a';
    return (
      <As href={href} aria-current={active ? 'page' : undefined} className={cls} {...(onClick ? { onClick } : {})}>
        {inner}
      </As>
    );
  }
  return (
    <button type="button" onClick={onClick} aria-current={active ? 'page' : undefined} className={cls}>
      {inner}
    </button>
  );
}

/** Conta no rodapé do trilho: círculo de 44 px --panel-dark com o ícone `user`. `aria-label` obrigatório. */
export function RailAccount({
  'aria-label': ariaLabel,
  onClick,
  active = false,
  children,
}: {
  'aria-label': string;
  onClick?: () => void;
  /** On /conta (F13 FR-1): ring around the avatar + aria-current. */
  active?: boolean;
  /** Avatar (photo or initials); without it, the user icon. */
  children?: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      aria-current={active ? 'page' : undefined}
      onClick={onClick}
      className={`flex size-11 items-center justify-center rounded-full bg-panel-dark text-on-dark ${active ? 'ring-2 ring-primary ring-offset-2 ring-offset-surface' : ''} ${focusRing}`}
    >
      {children ?? <Icon name="user" size={20} />}
    </button>
  );
}
