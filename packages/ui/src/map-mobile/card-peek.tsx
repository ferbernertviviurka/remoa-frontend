'use client';

import { useId, useState } from 'react';
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
  /** Resumo (até 4 linhas); vazio = sem linha. */
  summary?: string;
  /** Resposta (verso do card). Com ela e os textos, aparece "Ver resposta", que a abre aqui mesmo (D-1572). */
  answer?: string;
  showAnswerLabel?: string;
  hideAnswerLabel?: string;
  answerLabel?: string;
  /** Lembrança 0–1 (barra); `null` = sem revisões (barra vazia). */
  recall: number | null;
  /** Texto pronto ao lado da barra ("58% · vence hoje"). */
  nextLabel: string;
  closeLabel: string;
  reviewLabel: string;
  /** Nome acessível de Editar ("Editar card"); `editText` é o texto visível ("Editar"). */
  editLabel: string;
  editText: string;
  /** Nome acessível de Conectar ("Conectar a outro card"); `connectText` é o texto visível ("Conectar"). */
  connectLabel: string;
  connectText: string;
  onClose: () => void;
  onReview: () => void;
  onEdit: () => void;
  onConnect: () => void;
  /** Texto visível de Desafiar. Sem os dois, o botão não aparece. */
  challengeLabel?: string;
  onChallenge?: () => void;
};

const dot: Record<MapCardState, string> = { review: 'bg-(--state-review-border)', watch: 'bg-(--state-watch-border)', steady: 'bg-(--state-steady-border)', unknown: 'bg-(--state-unknown-soft)' };
const text: Record<MapCardState, string> = { review: 'text-(--state-review-text)', watch: 'text-(--state-watch-text)', steady: 'text-ink-2', unknown: 'text-muted' };
const secondary = `flex h-12 grow basis-0 cursor-pointer items-center justify-center gap-2 rounded-[15px] border-[1.5px] border-border-strong bg-surface text-[15px] font-bold text-ink transition-transform active:scale-[.98] ${focusRing}`;

/**
 * CardPeek (F23 FR-8, `MapaMobileCard.dc.html`): cartão logo acima da barra do mapa com tipo, estado, título, resumo, "Ver resposta"
 * (quando o card tem resposta), barra de lembrança e as ações Revisar, Conectar e Editar (alvos 44+ px). Conectar e Editar têm texto
 * visível (D-1207). O posicionamento é do consumidor só no `bottom`/`z`: aqui já é `absolute`; `data-card-peek` deixa o mapa medir a
 * altura para o card tocado não ficar por baixo (D-1572). Entra com `pop`; só `transform`/`opacity` se movem.
 */
export function CardPeek(p: CardPeekProps) {
  const [open, setOpen] = useState(false);
  const answerId = useId();
  const canAnswer = !!(p.answer && p.showAnswerLabel && p.hideAnswerLabel);
  return (
    <section
      aria-label={p.ariaLabel}
      data-card-peek=""
      className="pop absolute inset-x-3 bottom-[calc(76px+env(safe-area-inset-bottom))] z-[35] flex max-h-[min(60%,calc(100%-176px-env(safe-area-inset-bottom)))] flex-col gap-2.5 overflow-y-auto overscroll-contain rounded-[28px] bg-surface p-4 pb-3.5 shadow-[0_22px_50px_rgba(36,26,92,.28)]"
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
      {p.summary ? <span className="line-clamp-4 text-sm leading-[1.45] text-ink-2">{p.summary}</span> : null}
      {canAnswer ? (
        <>
          <button type="button" aria-expanded={open} aria-controls={answerId} onClick={() => setOpen((o) => !o)} className={`${secondary} w-full shrink-0 grow-0 basis-auto`}>
            <MapGlyph name={open ? 'eyeOff' : 'eye'} size={18} />
            {open ? p.hideAnswerLabel : p.showAnswerLabel}
          </button>
          {open ? (
            <div id={answerId} role="region" aria-label={p.answerLabel} className="rounded-[15px] bg-chip px-3.5 py-3 text-sm leading-[1.5] whitespace-pre-line text-ink [overflow-wrap:anywhere]">
              {p.answer}
            </div>
          ) : null}
        </>
      ) : null}
      <div className="flex items-center gap-2.5">
        <span aria-hidden="true" className="block h-2 grow overflow-hidden rounded bg-chip">
          <span className={`block h-2 rounded ${dot[p.state]}`} style={{ width: `${Math.round((p.recall ?? 0) * 100)}%` }} />
        </span>
        <span className="text-[12.5px] font-bold whitespace-nowrap text-ink-2">{p.nextLabel}</span>
      </div>
      <button type="button" onClick={p.onReview} className={`flex h-12 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-[15px] bg-primary text-[15px] font-extrabold text-on-primary transition-transform active:scale-[.98] ${focusRing}`}>
        <MapGlyph name="bolt" size={18} />
        {p.reviewLabel}
      </button>
      {p.onChallenge && p.challengeLabel ? (
        <button type="button" onClick={p.onChallenge} className={`flex h-12 w-full shrink-0 cursor-pointer items-center justify-center gap-2 rounded-[15px] border-[1.5px] border-border-strong bg-surface text-[15px] font-bold text-ink transition-transform active:scale-[.98] ${focusRing}`}>
          <MapGlyph name="sparkle" size={18} />
          {p.challengeLabel}
        </button>
      ) : null}
      <div className="flex shrink-0 gap-2">
        <button type="button" aria-label={p.connectLabel} onClick={p.onConnect} className={secondary}>
          <MapGlyph name="link" size={18} />
          {p.connectText}
        </button>
        <button type="button" aria-label={p.editLabel} onClick={p.onEdit} className={secondary}>
          <MapGlyph name="pencil" size={18} />
          {p.editText}
        </button>
      </div>
    </section>
  );
}
