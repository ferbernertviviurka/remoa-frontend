'use client';

import { useId, type ComponentType, type ReactNode } from 'react';
import { focusRing } from '../button-styles';
import { Icon, type IconName } from '../icons';
import { Logo } from '../logo';

type LinkLike = ComponentType<{ href: string; 'aria-current'?: 'page'; className?: string; children?: ReactNode }> | 'a';

export type AdminNavItem = {
  id: string;
  label: string;
  icon: IconName;
  href: string;
  /** contador (chamados abertos); some se for 0 ou ausente */
  badge?: number;
  /** texto só para leitor de tela do contador ("9 chamados abertos") */
  badgeLabel?: string;
};

/**
 * AdminSidebar (F19 FR-12): barra lateral escura de 264 px (`--admin-nav`, igual nos dois temas: o admin é propositalmente diferente do app).
 * Marca com selo `badge` ("ADMIN", laranja), `items` (7 no MVP; o ativo = `activeId`, fundo branco 10%, `aria-current="page"`; altura 48 px),
 * contador de chamados abertos em `badge`, e no rodapé o cartão do admin com "Voltar ao app" (`backLabel`/`backHref`). `<nav aria-label>` obrigatório.
 * `as` troca o elemento de link (ex.: next/link). A decisão de mostrar ou não vem do servidor (404 para não-admin), não daqui.
 */
export type AdminSidebarProps = {
  'aria-label': string;
  brandLabel: string;
  badge: string;
  items: ReadonlyArray<AdminNavItem>;
  activeId: string;
  account: { initial: string; name: string; email: string };
  backLabel: string;
  backHref: string;
  as?: LinkLike;
  /** G14: "Sair" no cartão do admin; só aparece com os dois. */
  signOutLabel?: string;
  onSignOut?: () => void;
};

export function AdminSidebar({ brandLabel, badge, items, activeId, account, backLabel, backHref, as, signOutLabel, onSignOut, ...rest }: AdminSidebarProps) {
  const As: LinkLike = as ?? 'a';
  return (
    <nav aria-label={rest['aria-label']} className="sticky top-0 box-border flex h-dvh w-[264px] shrink-0 self-start flex-col gap-1.5 overflow-y-auto bg-admin-nav px-4 py-[22px] text-on-dark-muted">
      <div className="flex items-center gap-2.5 px-2.5 pb-[18px]">
        {/* G14 (D-587): the logo goes back to the app (Hoje), like the wordmark everywhere else when signed in. */}
        <As href={backHref} className={`flex min-h-11 items-center rounded-[10px] ${focusRing}`}>
          <Logo title={brandLabel} withWordmark onDark size={28} />
        </As>
        <span className="ml-auto rounded-pill bg-review px-2.5 py-[3px] text-[11px] font-extrabold tracking-[0.08em] text-white">{badge}</span>
      </div>
      {items.map((it) => {
        const on = it.id === activeId;
        return (
          <As key={it.id} href={it.href} aria-current={on ? 'page' : undefined} className={`flex h-12 items-center gap-3 rounded-[14px] px-3.5 text-[15px] no-underline transition-colors duration-150 ${on ? 'bg-white/10 font-bold text-white' : 'bg-transparent font-semibold hover:bg-white/5 hover:text-white'} ${focusRing}`}>
            <Icon name={it.icon} size={22} />
            {it.label}
            {it.badge ? (
              <span className="ml-auto flex h-6 min-w-6 items-center justify-center rounded-pill bg-review px-2 text-xs font-extrabold text-white">
                <span aria-hidden={it.badgeLabel ? true : undefined}>{it.badge}</span>
                {it.badgeLabel ? <span className="sr-only">{it.badgeLabel}</span> : null}
              </span>
            ) : null}
          </As>
        );
      })}
      <span aria-hidden="true" className="grow" />
      <div className="flex flex-col gap-2.5 rounded-[20px] bg-white/[.07] p-3.5">
        <span className="flex items-center gap-2.5">
          <span aria-hidden="true" className="flex size-10 items-center justify-center rounded-full bg-steady-on-dark font-display font-extrabold text-panel-dark">{account.initial}</span>
          <span className="flex min-w-0 flex-col leading-tight">
            <span className="font-bold text-white">{account.name}</span>
            <span className="truncate text-[12.5px]">{account.email}</span>
          </span>
        </span>
        <As href={backHref} className={`flex h-11 items-center gap-2 rounded-[12px] border border-white/20 px-3 text-sm font-bold text-white no-underline hover:bg-white/10 ${focusRing}`}>
          <Icon name="left" size={18} />
          {backLabel}
        </As>
        {signOutLabel && onSignOut ? (
          <button type="button" onClick={onSignOut} className={`flex h-11 cursor-pointer items-center gap-2 rounded-[12px] border border-white/20 bg-transparent px-3 text-sm font-bold text-white hover:bg-white/10 ${focusRing}`}>
            <Icon name="logout" size={18} />
            {signOutLabel}
          </button>
        ) : null}
      </div>
    </nav>
  );
}

/**
 * AdminHeader (F19 FR-12): cabeçalho de 84 px (mínimo), fundo --surface, borda inferior. `title` é o <h1> da página; `subtitle` (ex.: "Dados de exemplo · atualizado agora").
 * `children` = ações à direita (AdminSearch, PeriodSegmented, botão Exportar).
 */
export type AdminHeaderProps = { title: string; subtitle?: string; children?: ReactNode };

export function AdminHeader({ title, subtitle, children }: AdminHeaderProps) {
  return (
    <header className="flex min-h-[84px] items-center justify-between gap-5 border-b border-border bg-surface px-10 py-4">
      <div className="flex flex-col gap-0.5">
        <h1 className="m-0 font-display text-[30px] font-extrabold leading-[1.1] tracking-[-0.03em]">{title}</h1>
        {subtitle ? <span className="text-sm text-muted" suppressHydrationWarning>{subtitle}</span> : null}
      </div>
      {children ? <div className="flex items-center gap-3">{children}</div> : null}
    </header>
  );
}

/** AdminSearch: busca do cabeçalho (340 × 46, raio 14, borda 1,5 px, lupa à esquerda). `label` só para leitor de tela. `type="search"`. */
export type AdminSearchProps = { label: string; placeholder: string; value: string; onValueChange: (value: string) => void };

export function AdminSearch({ label, placeholder, value, onValueChange }: AdminSearchProps) {
  const id = useId();
  return (
    <span className="relative block">
      <label htmlFor={id} className="sr-only">{label}</label>
      <span aria-hidden="true" className="pointer-events-none absolute left-3.5 top-[13px] text-muted"><Icon name="search" size={20} /></span>
      <input id={id} type="search" placeholder={placeholder} value={value} onChange={(e) => onValueChange(e.target.value)} className={`box-border h-[46px] w-[340px] max-w-full rounded-[14px] border-[1.5px] border-border-strong bg-surface pl-11 pr-3.5 text-[15px] text-ink placeholder:text-muted hover:border-primary focus-visible:border-primary ${focusRing}`} />
    </span>
  );
}

/**
 * PeriodSegmented (F19 FR-13): 7 / 30 / 90 dias com marcador branco que desliza (400 ms). Trilho 300 × 46, raio 15, padding 4; marcador 38 px, raio 11.
 * Grupo com `aria-label` e botões `aria-pressed` (não é um Segmented do Radix porque precisa do marcador animado). Com movimento reduzido o marcador salta.
 */
export type PeriodSegmentedProps = { 'aria-label': string; options: ReadonlyArray<{ value: string; label: string }>; value: string; onValueChange: (value: string) => void };

export function PeriodSegmented({ options, value, onValueChange, ...rest }: PeriodSegmentedProps) {
  const idx = Math.max(0, options.findIndex((o) => o.value === value));
  return (
    <div role="group" aria-label={rest['aria-label']} className="relative box-border flex h-[46px] w-[300px] rounded-[15px] bg-track p-1">
      <span
        aria-hidden="true"
        data-testid="period-marker"
        style={{ width: `calc((100% - 8px) / ${options.length})`, transform: `translateX(${idx * 100}%)` }}
        className="absolute left-1 top-1 h-[38px] rounded-[11px] bg-surface shadow-[0_4px_12px_rgba(36,26,92,.14)] transition-transform duration-[400ms] ease-[cubic-bezier(.22,1,.36,1)]"
      />
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={o.value === value} onClick={() => onValueChange(o.value)} className={`relative flex-1 cursor-pointer rounded-[11px] bg-transparent text-sm font-bold transition-colors duration-200 ${o.value === value ? 'text-primary-deep' : 'text-muted hover:text-ink'} ${focusRing}`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
