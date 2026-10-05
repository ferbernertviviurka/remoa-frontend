'use client';

import { focusRing } from '../button-styles';
import { MapGlyph } from './glyph';

/**
 * FloatingMapBar (F23 FR-12, D-661): rodapé flutuante do mapa no celular, a 24 px do rodapé + safe area. À esquerda "Revisar" com o selo
 * de vencidos (pulsa); à direita a pílula com "Cards em lista" (alternância) e o botão circular de 60 px **Criar card**, o ÚNICO botão
 * de criação (o "+" gira 45° com a sheet aberta). Posiciona-se `absolute` no contêiner do mapa. `hidden` some a barra (editor aberto).
 * Com a sheet de criar aberta, uma cópia com `createOpen` vai no `footer` da sheet (por cima do scrim) e o "×" fecha a sheet.
 * Textos por props. Só `transform`/`opacity` nos movimentos.
 */
export type FloatingMapBarProps = {
  reviewLabel: string;
  /** Nome acessível completo, ex.: "Revisar este mapa, 2 para hoje". */
  reviewAriaLabel?: string;
  dueCount?: number;
  onReview: () => void;
  listLabel: string;
  listActive?: boolean;
  onToggleList: () => void;
  createLabel: string;
  createOpen?: boolean;
  onCreate: () => void;
  hidden?: boolean;
};

export function FloatingMapBar(p: FloatingMapBarProps) {
  if (p.hidden) return null;
  const due = p.dueCount ?? 0;
  return (
    <div className="pointer-events-none absolute inset-x-4 bottom-[calc(24px+env(safe-area-inset-bottom))] z-60 flex items-center justify-between">
      <button
        type="button"
        aria-label={p.reviewAriaLabel}
        onClick={p.onReview}
        className={`pointer-events-auto relative flex h-[60px] cursor-pointer items-center gap-2.5 rounded-[30px] bg-ink pr-[22px] pl-[18px] text-base font-extrabold text-on-dark shadow-[0_16px_36px_rgba(26,21,51,.4)] transition-transform duration-200 hover:-translate-y-[3px] active:scale-[0.98] focus-visible:outline-offset-4 ${focusRing}`}
      >
        <MapGlyph name="bolt" />
        {p.reviewLabel}
        {due > 0 ? (
          <span className="relative flex h-[26px] min-w-[26px] items-center justify-center rounded-full bg-review px-2 text-[13px] font-extrabold">
            <span aria-hidden="true" className="mm-ring absolute inset-0 rounded-full bg-review" />
            <span className="relative">{due}</span>
          </span>
        ) : null}
      </button>
      <div className="pointer-events-auto flex items-center gap-1.5 rounded-[34px] bg-ink p-1 shadow-[0_16px_36px_rgba(26,21,51,.4)]">
        <button
          type="button"
          aria-label={p.listLabel}
          aria-pressed={!!p.listActive}
          onClick={p.onToggleList}
          className={`flex size-[52px] cursor-pointer items-center justify-center rounded-full text-on-dark transition-[background-color,transform] duration-200 active:scale-95 focus-visible:outline-offset-2 focus-visible:outline-2 focus-visible:outline-on-dark ${p.listActive ? 'bg-white/20' : 'bg-transparent'}`}
        >
          <MapGlyph name="list" size={24} />
        </button>
        <button
          type="button"
          aria-label={p.createLabel}
          aria-haspopup="dialog"
          aria-expanded={!!p.createOpen}
          onClick={(e) => { e.currentTarget.focus(); p.onCreate(); }} // Safari does not focus buttons on tap: the sheet returns focus to whoever had it
          className="flex size-[60px] cursor-pointer items-center justify-center rounded-full bg-primary text-on-primary shadow-[0_8px_20px_rgba(109,91,208,.5)] transition-transform duration-200 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-on-dark"
        >
          <span aria-hidden="true" className={`flex ${p.createOpen ? 'mm-fab-x' : ''} transition-transform duration-[400ms] ease-[cubic-bezier(.22,1,.36,1)]`} style={{ transform: `rotate(${p.createOpen ? 45 : 0}deg)` }}>
            <MapGlyph name="plus" size={30} />
          </span>
        </button>
      </div>
    </div>
  );
}
