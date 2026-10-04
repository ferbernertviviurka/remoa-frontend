'use client';

import { useId, useState, type ReactNode } from 'react';
import { Icon } from '../icons';
import { focusRing } from '../button-styles';

export type QuestionItem = { id: string; question: string; answer: ReactNode };
export type QuestionAccordionProps = {
  items: QuestionItem[];
  /** Um aberto por vez (padrão true). */
  singleOpen?: boolean;
  defaultOpenId?: string;
  onToggle?: (id: string, open: boolean) => void;
};

/**
 * Perguntas frequentes. Cada pergunta é um `<button aria-expanded aria-controls>` dentro de um `h3`; a resposta é `region`.
 * Altura em 400 ms e ícone girando 45° em 300 ms (movimento reduzido: sem transição). Resposta fechada fica `inert`.
 */
export function QuestionAccordion({ items, singleOpen = true, defaultOpenId, onToggle }: QuestionAccordionProps) {
  const uid = useId();
  const [open, setOpen] = useState<string[]>(defaultOpenId ? [defaultOpenId] : []);
  const toggle = (id: string) => {
    const isOpen = open.includes(id);
    setOpen(isOpen ? open.filter((x) => x !== id) : singleOpen ? [id] : [...open, id]);
    onToggle?.(id, !isOpen);
  };
  return (
    <div className="rounded-[34px] border border-border bg-surface px-4 py-2.5 md:px-7">
      {items.map((it, i) => {
        const on = open.includes(it.id);
        return (
          <div key={it.id} className={i === 0 ? '' : 'border-t border-divider'}>
            <h3 className="m-0">
              <button type="button" id={`${uid}-q-${it.id}`} aria-expanded={on} aria-controls={`${uid}-a-${it.id}`} onClick={() => toggle(it.id)} className={`flex min-h-[72px] w-full cursor-pointer items-center justify-between gap-4 rounded-2xl border-0 bg-transparent px-1 text-left text-base font-bold text-ink md:text-lg ${focusRing}`}>
                <span>{it.question}</span>
                <span aria-hidden="true" className={`flex shrink-0 text-primary-deep transition-transform duration-300 ease-[cubic-bezier(.22,1,.36,1)] ${on ? 'rotate-45' : ''}`}><Icon name="plus" size={22} /></span>
              </button>
            </h3>
            <div id={`${uid}-a-${it.id}`} role="region" aria-labelledby={`${uid}-q-${it.id}`} inert={!on} className={`grid transition-[grid-template-rows] duration-[400ms] ease-[cubic-bezier(.22,1,.36,1)] ${on ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
              <div className="min-h-0 overflow-hidden">
                <div className="max-w-[660px] px-1 pb-5 text-base leading-[1.6] text-ink-2">{it.answer}</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
