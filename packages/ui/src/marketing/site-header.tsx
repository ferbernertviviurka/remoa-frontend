'use client';

import { useEffect, useRef, type KeyboardEvent, type ReactNode } from 'react';
import { Icon } from '../icons';
import { focusRing } from '../button';
import { useControlled } from './use-controlled';

export type SiteLink = { href: string; label: string; active?: boolean };
export type SiteHeaderProps = {
  brand: ReactNode;
  links: SiteLink[];
  /** Ações à direita (Entrar, CTA). Aparecem no cabeçalho em ≥ 768 px e dentro da folha no celular. */
  actions: ReactNode;
  /** Nome acessível do botão de menu. */
  menuLabel: string;
  /** Nome acessível da navegação (`aria-label`). */
  navLabel: string;
  open?: boolean;
  onToggleMenu?: (open: boolean) => void;
};

const linkCls = `flex h-11 items-center rounded-xl px-4 text-[15px] font-semibold text-ink no-underline hover:bg-track ${focusRing}`;
const FOCUSABLE = 'a[href],button:not([disabled]),input,[tabindex]:not([tabindex="-1"])';

/**
 * Cabeçalho fixo de 76 px (translúcido, desfoque). A página precisa reservar 76 px no topo (`pt-[76px]`).
 * Até 767 px: botão de menu (44 px) abre uma folha com foco preso, Esc fecha e devolve o foco ao botão.
 * Âncora ativa: `active` (o app liga com IntersectionObserver) vira `aria-current="location"`.
 */
export function SiteHeader({ brand, links, actions, menuLabel, navLabel, open, onToggleMenu }: SiteHeaderProps) {
  const [isOpen, setOpen] = useControlled(open, false);
  const btn = useRef<HTMLButtonElement>(null);
  const sheet = useRef<HTMLDivElement>(null);
  const set = (v: boolean) => { setOpen(v); onToggleMenu?.(v); };

  useEffect(() => {
    if (!isOpen) return;
    sheet.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
  }, [isOpen]);

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') { set(false); btn.current?.focus(); return; }
    if (e.key !== 'Tab' || !sheet.current) return;
    const f = [btn.current, ...sheet.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((x): x is HTMLElement => !!x);
    const first = f[0]!, last = f[f.length - 1]!;
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };

  const items = (cls: string) => links.map((l) => (
    <a key={l.href} href={l.href} aria-current={l.active ? 'location' : undefined} onClick={() => isOpen && set(false)} className={`${cls} ${l.active ? 'bg-primary-tint text-primary-deep' : ''}`}>{l.label}</a>
  ));

  return (
    <header onKeyDown={isOpen ? onKey : undefined} className="fixed inset-x-0 top-0 z-[60] h-[76px] border-b border-border bg-canvas/90 backdrop-blur-[14px]">
      <div className="mx-auto flex h-full w-full max-w-[1280px] items-center justify-between gap-4 px-4 md:px-10">
        <div className="flex shrink-0 items-center">{brand}</div>
        <nav aria-label={navLabel} className="hidden items-center gap-1.5 md:flex">{items(linkCls)}</nav>
        <div className="hidden items-center gap-2.5 md:flex">{actions}</div>
        <button ref={btn} type="button" aria-label={menuLabel} aria-expanded={isOpen} aria-controls="site-menu" onClick={() => set(!isOpen)} className={`flex size-11 cursor-pointer items-center justify-center rounded-xl border border-border-strong bg-surface text-ink md:hidden ${focusRing}`}>
          <Icon name={isOpen ? 'close' : 'list'} size={22} />
        </button>
      </div>
      {isOpen ? (
        <div ref={sheet} id="site-menu" role="dialog" aria-modal="true" aria-label={menuLabel} className="slide absolute inset-x-0 top-[76px] flex max-h-[calc(100dvh-76px)] flex-col gap-1 overflow-y-auto border-b border-border bg-canvas px-4 pt-3 pb-6 shadow-float md:hidden">
          <nav className="flex flex-col gap-1">{items(`${linkCls} h-12 text-base`)}</nav>
          <div className="mt-3 flex flex-col gap-2.5 [&>a]:min-h-12 [&>a]:justify-center">{actions}</div>
        </div>
      ) : null}
    </header>
  );
}

export type SiteFooterProps = {
  brand: ReactNode;
  tagline: string;
  navLabel: string;
  /** Grupos de links (ex.: Produto, Legal). */
  links: { title?: string; items: { href: string; label: string }[] }[];
  disclaimer: string;
  copyright?: string;
};

/** Rodapé: marca, lema, aviso clínico e grupos de links (alvo de 44 px no celular, 36 px a partir de 768 px). */
export function SiteFooter({ brand, tagline, navLabel, links, disclaimer, copyright }: SiteFooterProps) {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-10 px-4 py-10 md:flex-row md:justify-between md:px-10 md:py-14">
        <div className="flex max-w-[360px] flex-col gap-2.5">
          {brand}
          <span className="text-[15px] text-muted">{tagline}</span>
          <span className="text-[13px] leading-normal text-muted">{disclaimer}</span>
          {copyright ? <span className="text-[13px] text-muted">{copyright}</span> : null}
        </div>
        <nav aria-label={navLabel} className="flex flex-wrap gap-x-16 gap-y-8">
          {links.map((g, i) => (
            <div key={g.title ?? i} className="flex flex-col gap-1">
              {g.title ? <span className="mb-1.5 text-xs font-bold uppercase tracking-[0.12em] text-muted">{g.title}</span> : null}
              {g.items.map((l) => <a key={l.href + l.label} href={l.href} className={`flex h-11 items-center rounded-lg font-semibold text-ink no-underline hover:underline md:h-9 ${focusRing}`}>{l.label}</a>)}
            </div>
          ))}
        </nav>
      </div>
    </footer>
  );
}
