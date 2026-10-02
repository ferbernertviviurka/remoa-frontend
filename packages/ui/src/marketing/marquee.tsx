'use client';

import { useState, type ReactNode } from 'react';
import { focusRing } from '../button';

export type MarqueeProps = { items: ReactNode[]; label: string; pauseLabel: string; playLabel: string; speedSeconds?: number };

/**
 * Faixa em rolagem contínua, decorativa (`aria-hidden`). Pausa com o mouse e com o foco dentro do grupo; há um botão
 * de pausa/retomada sempre visível enquanto houver movimento (FR-17). Movimento reduzido: sem animação, sem botão, itens em linhas.
 */
export function Marquee({ items, label, pauseLabel, playLabel, speedSeconds = 38 }: MarqueeProps) {
  const [paused, setPaused] = useState(false);
  const half = (hidden: boolean) => (
    <div className={`flex shrink-0 gap-4 pr-4 ${hidden ? 'mk-marquee-dup' : 'mk-marquee-half'}`}>{items.map((it, i) => <span key={i} className="shrink-0">{it}</span>)}</div>
  );
  return (
    <div role="group" aria-label={label} className="mk-marquee flex items-center gap-3">
      <div aria-hidden="true" className="mk-marquee-mask min-w-0 flex-1 overflow-hidden">
        <div className="mk-marquee-track flex w-max" data-paused={paused ? '' : undefined} style={{ animationDuration: `${speedSeconds}s` }}>
          {half(false)}
          {half(true)}
        </div>
      </div>
      <button type="button" onClick={() => setPaused((p) => !p)} aria-label={paused ? playLabel : pauseLabel} className={`mk-marquee-btn mr-4 flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full border border-border-strong bg-surface text-ink md:mr-10 ${focusRing}`}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          {paused ? <path d="M7 4l13 8-13 8z" /> : <path d="M6 4h4v16H6zM14 4h4v16h-4z" />}
        </svg>
      </button>
    </div>
  );
}
