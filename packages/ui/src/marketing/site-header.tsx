'use client';

import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Icon, type IconName } from '../icons';
import { focusRing } from '../button-styles';
import { useControlled } from './use-controlled';

export type SiteLink = { href: string; label: string; active?: boolean };
export type MegaItem = { href: string; title: string; text: string; icon: IconName };
/** Grupo de funcionalidades num painel (mega menu). `active` acende o gatilho quando a seção visível é uma delas. */
export type SiteMegaMenu = { label: string; items: MegaItem[]; active?: boolean };
export type SiteHeaderProps = {
  brand: ReactNode;
  links: SiteLink[];
  /** Mega menu antes dos links (desktop: painel com ícones; celular: lista no topo da folha). */
  mega?: SiteMegaMenu;
  /** Ações à direita (Entrar, CTA). Aparecem no cabeçalho em ≥ 1280 px e dentro da folha abaixo disso. */
  actions: ReactNode;
  /** Nome acessível do botão de menu. */
  menuLabel: string;
  /** Nome acessível da navegação (`aria-label`). */
  navLabel: string;
  open?: boolean;
  onToggleMenu?: (open: boolean) => void;
};

const linkCls = `flex h-11 items-center rounded-xl px-4 whitespace-nowrap text-[15px] font-semibold text-ink no-underline hover:bg-track ${focusRing}`;
const FOCUSABLE = 'a[href],button:not([disabled]),input,[tabindex]:not([tabindex="-1"])';

function MegaLink({ item, onPick, compact }: { item: MegaItem; onPick: () => void; compact?: boolean }) {
  return (
    <a href={item.href} onClick={onPick} className={`flex items-center gap-3 rounded-2xl text-ink no-underline hover:bg-track ${compact ? 'min-h-12 px-2.5 py-1' : 'p-2.5'} ${focusRing}`}>
      <span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary-tint text-primary-deep"><Icon name={item.icon} size={20} /></span>
      <span className="flex min-w-0 flex-col leading-[1.3]">
        <span className="text-[15px] font-bold">{item.title}</span>
        {compact ? null : <span className="text-[13px] text-muted">{item.text}</span>}
      </span>
    </a>
  );
}

/**
 * Cabeçalho fixo de 76 px (translúcido, desfoque). A página precisa reservar 76 px no topo (`pt-[76px]`).
 * Até 1279 px: botão de menu (44 px) abre uma folha com foco preso, Esc fecha e devolve o foco ao botão.
 * Mega menu (≥ 1280 px): botão com `aria-expanded` abre o painel; Esc, clique fora ou escolher um item fecha.
 * Âncora ativa: `active` (o app liga com IntersectionObserver) vira `aria-current="location"`.
 */
export function SiteHeader({ brand, links, mega, actions, menuLabel, navLabel, open, onToggleMenu }: SiteHeaderProps) {
  const [isOpen, setOpen] = useControlled(open, false);
  const [megaOpen, setMegaOpen] = useState(false);
  const btn = useRef<HTMLButtonElement>(null);
  const sheet = useRef<HTMLDivElement>(null);
  const megaRoot = useRef<HTMLDivElement>(null);
  const megaBtn = useRef<HTMLButtonElement>(null);
  const megaId = useId();
  const set = (v: boolean) => { setOpen(v); onToggleMenu?.(v); };

  useEffect(() => {
    if (!isOpen) return;
    sheet.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
  }, [isOpen]);

  useEffect(() => {
    if (!megaOpen) return;
    const away = (e: PointerEvent) => { if (!megaRoot.current?.contains(e.target as Node)) setMegaOpen(false); };
    const esc = (e: globalThis.KeyboardEvent) => { if (e.key === 'Escape') { setMegaOpen(false); megaBtn.current?.focus(); } };
    document.addEventListener('pointerdown', away);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('pointerdown', away); document.removeEventListener('keydown', esc); };
  }, [megaOpen]);

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
        <nav aria-label={navLabel} className="hidden items-center gap-1 xl:flex">
          {mega ? (
            <div ref={megaRoot}>
              <button
                ref={megaBtn}
                type="button"
                aria-expanded={megaOpen}
                aria-current={mega.active ? 'location' : undefined}
                aria-controls={megaId}
                onClick={() => setMegaOpen((v) => !v)}
                className={`${linkCls} cursor-pointer gap-1.5 border-0 bg-transparent ${megaOpen || mega.active ? 'bg-primary-tint text-primary-deep' : ''}`}
              >
                {mega.label}
                <Icon name="chevronDown" size={16} className={`transition-transform duration-200 ${megaOpen ? 'rotate-180' : ''}`} />
              </button>
              {megaOpen ? (
                <div id={megaId} className="absolute inset-x-0 top-[84px] mx-auto w-[min(800px,calc(100vw-48px))]">
                  <ul className="slide m-0 grid list-none grid-cols-3 gap-1 rounded-[26px] border border-border bg-surface p-3 shadow-float">
                    {mega.items.map((it) => <li key={it.href + it.title}><MegaLink item={it} onPick={() => setMegaOpen(false)} /></li>)}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}
          {items(linkCls)}
        </nav>
        <div className="hidden shrink-0 items-center gap-2.5 xl:flex">{actions}</div>
        <button ref={btn} type="button" aria-label={menuLabel} aria-expanded={isOpen} aria-controls="site-menu" onClick={() => set(!isOpen)} className={`flex size-11 cursor-pointer items-center justify-center rounded-xl border border-border-strong bg-surface text-ink xl:hidden ${focusRing}`}>
          <Icon name={isOpen ? 'close' : 'list'} size={22} />
        </button>
      </div>
      {isOpen ? (
        <div ref={sheet} id="site-menu" role="dialog" aria-modal="true" aria-label={menuLabel} className="slide absolute inset-x-0 top-[76px] flex max-h-[calc(100dvh-76px)] flex-col gap-1 overflow-y-auto border-b border-border bg-canvas px-4 pt-3 pb-6 shadow-float xl:hidden">
          {mega ? (
            <>
              <span className="px-2.5 pt-1 pb-1.5 text-xs font-bold tracking-[.12em] text-muted uppercase">{mega.label}</span>
              <ul className="m-0 grid list-none grid-cols-1 gap-0.5 p-0 sm:grid-cols-2">
                {mega.items.map((it) => <li key={it.href + it.title}><MegaLink item={it} compact onPick={() => set(false)} /></li>)}
              </ul>
              <span aria-hidden="true" className="my-2 h-px bg-border" />
            </>
          ) : null}
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
