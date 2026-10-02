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
export type AppRailProps = { 'aria-label': string; logo: ReactNode; children: ReactNode; account?: ReactNode };

export function AppRail({ logo, children, account, ...rest }: AppRailProps) {
  return (
    <nav {...rest} className="flex w-[88px] shrink-0 flex-col items-center gap-1.5 border-r border-border bg-surface pb-[18px] pt-4">
      <div className="flex size-14 items-center justify-center rounded-[18px]">{logo}</div>
      <span aria-hidden="true" className="h-3" />
      {children}
      <span aria-hidden="true" className="grow" />
      {account}
    </nav>
  );
}

type LinkLike = ComponentType<{ href: string; 'aria-current'?: 'page'; className?: string; children?: ReactNode }> | 'a';

export type RailItemProps = {
  icon: IconName;
  label: string;
  active?: boolean;
  badge?: number | string;
  badgeLabel?: string;
  href?: string;
  as?: LinkLike;
  onClick?: () => void;
};

export function RailItem({ icon, label, active = false, badge, badgeLabel, href, as, onClick }: RailItemProps) {
  const cls = clsx(
    'relative flex h-16 w-[68px] flex-col items-center justify-center gap-1 rounded-[18px] border-0 text-xs no-underline transition-colors duration-150',
    active ? 'bg-primary-tint font-bold text-primary-deep' : 'bg-transparent font-semibold text-muted hover:bg-primary-tint/60',
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
      <As href={href} aria-current={active ? 'page' : undefined} className={cls}>
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
export function RailAccount({ 'aria-label': ariaLabel, onClick }: { 'aria-label': string; onClick?: () => void }) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      className={`flex size-11 items-center justify-center rounded-full bg-panel-dark text-on-dark ${focusRing}`}
    >
      <Icon name="user" size={20} />
    </button>
  );
}
