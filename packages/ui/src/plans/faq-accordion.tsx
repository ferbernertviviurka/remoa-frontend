'use client';

import { useId, useState } from 'react';
import { focusRing } from '../button-styles';

/**
 * FaqAccordion: perguntas e respostas, uma aberta por vez (`defaultOpen` opcional). Cada pergunta é <button aria-expanded aria-controls>
 * (Enter/Espaço nativos). Altura animada por `grid-template-rows` 0fr → 1fr em 400 ms; resposta fechada fica `inert`.
 * Desvio consciente: grid-template-rows anima layout (exigido pela spec FR-10); desligado com movimento reduzido.
 */
export type FaqItem = { value: string; question: string; answer: string };

export function FaqAccordion({ items, defaultOpen, onOpenChange }: { items: ReadonlyArray<FaqItem>; defaultOpen?: string; /** `value` da pergunta aberta, ou null ao fechar */ onOpenChange?: (value: string | null) => void }) {
  const [open, setOpen] = useState<string | null>(defaultOpen ?? null);
  const base = useId();
  return (
    <div className="flex flex-col">
      {items.map((it) => {
        const on = open === it.value;
        const id = `${base}-${it.value}`;
        return (
          <div key={it.value} className="border-t border-divider">
            <h3 className="m-0">
              <button
                type="button"
                id={`${id}-q`}
                aria-expanded={on}
                aria-controls={`${id}-a`}
                onClick={() => {
                  const next = on ? null : it.value;
                  setOpen(next);
                  onOpenChange?.(next);
                }}
                className={`flex min-h-[62px] w-full items-center justify-between gap-4 rounded-lg px-1 text-left text-base font-bold text-ink ${focusRing}`}
              >
                <span>{it.question}</span>
                <span aria-hidden="true" className={`flex text-primary-deep transition-transform duration-300 ${on ? 'rotate-45' : ''}`}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
                </span>
              </button>
            </h3>
            <div id={`${id}-a`} role="region" aria-labelledby={`${id}-q`} inert={!on} className={`grid transition-[grid-template-rows] duration-[400ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${on ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
              <div className="min-h-0 overflow-hidden">
                <p className="m-0 max-w-[640px] px-1 pb-[18px] text-[15px] leading-[1.55] text-muted">{it.answer}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
