'use client';

import { focusRing } from '../button-styles';
import { MapGlyph } from './glyph';
import type { MapCardState } from './map-card';

export type CardPeekProps = {
  /** Nome acessível da região ("Card selecionado"). */
  ariaLabel: string;
  typeLabel: string;
  state: MapCardState;
  stateLabel: string;
  title: string;
  /** Resumo (2 linhas); vazio = sem linha. */
  summary?: string;
  /** Lembrança 0–1 (barra); `null` = sem revisões (barra vazia). */
  recall: number | null;
  /** Texto pronto ao lado da barra ("58% · vence hoje"). */
  nextLabel: string;
  closeLabel: string;
  reviewLabel: string;
  editLabel: string;
  connectLabel: string;
  onClose: () => void;
  onReview: () => void;
  onEdit: () => void;
  onConnect: () => void;
};

const dot: Record<MapCardState, string> = { review: 'bg-(--state-review-border)', watch: 'bg-(--state-watch-border)', steady: 'bg-(--state-steady-border)', unknown: 'bg-(--state-unknown-soft)' };
const text: Record<MapCardState, string> = { review: 'text-(--state-review-text)', watch: 'text-(--state-watch-text)', steady: 'text-ink-2', unknown: 'text-muted' };
const sq = `flex size-12 shrink-0 cursor-pointer items-center justify-center rounded-[15px] border-[1.5px] border-border-strong bg-surface text-ink transition-transform active:scale-95 ${focusRing}`;

/**
 * CardPeek (F23 FR-8, `MapaMobileCard.dc.html`): cartão a 104 px do rodapé do mapa com tipo, estado, título, resumo, barra de
 * lembrança e as ações Revisar, Editar e Conectar (alvos 44+ px). O posicionamento é do consumidor só no `bottom`/`z`: aqui já é
 * `absolute`. Entra com `pop`; só `transform`/`opacity` se movem.
 */
export function CardPeek(p: CardPeekProps) {
  return (
    <section
      aria-label={p.ariaLabel}
      className="pop absolute inset-x-3 bottom-[calc(104px+env(safe-area-inset-bottom))] z-[35] flex flex-col gap-2.5 rounded-[28px] bg-surface p-4 pb-3.5 shadow-[0_22px_50px_rgba(36,26,92,.28)]"
    >
      <div className="flex items-start justify-between gap-2.5">
        <div className="flex min-w-0 flex-col gap-[5px]">
          <span className="flex items-center gap-2 text-xs font-bold text-muted">
            <span className="rounded-full bg-chip px-2.5 py-0.5 text-ink-2">{p.typeLabel}</span>
            <span className={`flex items-center gap-1.5 ${text[p.state]}`}>
              <span aria-hidden="true" className={`size-2 rounded-full ${dot[p.state]}`} />
              {p.stateLabel}
            </span>
          </span>
          <span className="font-display text-[21px] leading-[1.15] font-extrabold tracking-[-.025em] text-ink [overflow-wrap:anywhere]">{p.title}</span>
        </div>
        <button type="button" aria-label={p.closeLabel} onClick={p.onClose} className={`-mt-1.5 -mr-2 flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted ${focusRing}`}>
          <MapGlyph name="close" size={20} />
        </button>
      </div>
      {p.summary ? <span className="line-clamp-2 text-sm leading-[1.45] text-ink-2">{p.summary}</span> : null}
      <div className="flex items-center gap-2.5">
        <span aria-hidden="true" className="block h-2 grow overflow-hidden rounded bg-chip">
          <span className={`block h-2 rounded ${dot[p.state]}`} style={{ width: `${Math.round((p.recall ?? 0) * 100)}%` }} />
        </span>
        <span className="text-[12.5px] font-bold whitespace-nowrap text-ink-2">{p.nextLabel}</span>
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={p.onReview} className={`flex h-12 grow cursor-pointer items-center justify-center gap-2 rounded-[15px] bg-primary text-[15px] font-extrabold text-on-primary transition-transform active:scale-[.98] ${focusRing}`}>
          <MapGlyph name="bolt" size={18} />
          {p.reviewLabel}
        </button>
        <button type="button" aria-label={p.editLabel} onClick={p.onEdit} className={sq}><MapGlyph name="pencil" size={20} /></button>
        <button type="button" aria-label={p.connectLabel} onClick={p.onConnect} className={sq}><MapGlyph name="link" size={20} /></button>
      </div>
    </section>
  );
}
