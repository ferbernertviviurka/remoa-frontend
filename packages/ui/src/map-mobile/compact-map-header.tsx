'use client';

import { useEffect, useRef } from 'react';
import { MapGlyph } from './glyph';

export type MapSaveStatus = 'saved' | 'saving' | 'offline' | 'error';

const dot: Record<MapSaveStatus, string> = {
  saved: 'bg-[#86efac]', // verde do mock; sem token (ponto sobre fundo escuro)
  saving: 'bg-watch-on-dark',
  offline: 'bg-review-on-dark',
  error: 'bg-review-on-dark',
};

/**
 * CompactMapHeader (F23 FR-2/FR-3): pílula de 52 px do mapa no celular. Hambúrguer, título (Bricolage 17/800, truncado) com a linha de
 * estado ("Salvo há 2 min"), busca. Sem progresso, breadcrumb ou contadores (D-662). Textos por props.
 * `status`: saved (verde) · saving (âmbar) · offline (laranja) · error (laranja + `retryLabel`/`onRetry`).
 * Busca: `searchOpen` troca o título por um campo (`query`/`onQueryChange`); fechar chama `onSearchClose` (o consumidor limpa `query`).
 * O posicionamento (margem 12 px + safe area) é do consumidor.
 */
export type CompactMapHeaderProps = {
  title: string;
  statusText: string;
  status?: MapSaveStatus;
  retryLabel?: string;
  onRetry?: () => void;
  menuLabel: string;
  onMenu: () => void;
  searchLabel: string;
  onSearchOpen: () => void;
  searchOpen?: boolean;
  searchPlaceholder?: string;
  query?: string;
  onQueryChange?: (q: string) => void;
  closeSearchLabel?: string;
  onSearchClose?: () => void;
};

const btn = 'flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full transition-[transform,background-color] duration-150 hover:bg-white/10 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-on-dark';

export function CompactMapHeader(p: CompactMapHeaderProps) {
  const { status = 'saved', searchOpen = false } = p;
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { if (searchOpen) input.current?.focus(); }, [searchOpen]);
  return (
    <header className="flex h-[52px] items-center gap-0.5 rounded-[26px] bg-panel-dark px-1 text-on-dark shadow-[0_14px_30px_rgba(36,26,92,.3)]">
      <button type="button" aria-label={p.menuLabel} aria-haspopup="dialog" onClick={p.onMenu} className={btn}><MapGlyph name="menu" size={24} /></button>
      {searchOpen ? (
        <>
          <input
            ref={input}
            type="search"
            aria-label={p.searchLabel}
            placeholder={p.searchPlaceholder}
            value={p.query ?? ''}
            onChange={(e) => p.onQueryChange?.(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Escape') p.onSearchClose?.(); }}
            className="pop h-10 min-w-0 grow rounded-[20px] border-0 bg-white/14 px-3.5 text-base text-on-dark placeholder:text-on-dark-muted focus-visible:outline-2 focus-visible:outline-on-dark"
          />
          <button type="button" aria-label={p.closeSearchLabel} onClick={p.onSearchClose} className={btn}><MapGlyph name="close" size={20} /></button>
        </>
      ) : (
        <>
          <div className="flex min-w-0 grow flex-col leading-[1.2]">
            <span className="truncate font-display text-[17px] font-extrabold tracking-[-.02em]">{p.title}</span>
            <span role="status" data-status={status} className="flex items-center gap-1.5 text-xs text-on-dark-muted">
              <span aria-hidden="true" className={`size-[7px] shrink-0 rounded-full ${dot[status]}${status === 'saving' ? ' mm-ring' : ''}`} />
              <span className="truncate">{p.statusText}</span>
              {status === 'error' && p.onRetry ? (
                <button type="button" onClick={p.onRetry} className="relative h-5 shrink-0 cursor-pointer px-1 text-xs font-bold before:absolute before:-inset-x-1 before:-inset-y-3 before:content-[''] text-review-on-dark underline focus-visible:outline-2 focus-visible:outline-on-dark">{p.retryLabel}</button>
              ) : null}
            </span>
          </div>
          <button type="button" aria-label={p.searchLabel} onClick={p.onSearchOpen} className={btn}><MapGlyph name="search" /></button>
        </>
      )}
    </header>
  );
}
