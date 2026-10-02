import type { ReactNode } from 'react';
import { Reveal } from './reveal';

export type StepCardProps = { number: string; title: string; text?: string; thumbnail: ReactNode };

/** Passo de "Como funciona": numeração grande, título, miniatura (nó, 200 px de altura) e linha de texto. */
export function StepCard({ number, title, text, thumbnail }: StepCardProps) {
  return (
    <Reveal>
      <article className="flex flex-col gap-4">
        <div className="flex items-center gap-3.5">
          <span aria-hidden="true" className="font-display text-[48px] leading-none font-extrabold tracking-[-0.04em] text-border-strong md:text-[64px]">{number}</span>
          <h3 className="m-0 font-display text-[26px] font-extrabold tracking-[-0.03em] md:text-[30px]">{title}</h3>
        </div>
        <div className="relative h-[200px] overflow-hidden rounded-[24px] bg-primary-tint">{thumbnail}</div>
        {text ? <p className="m-0 text-base leading-normal text-muted">{text}</p> : null}
      </article>
    </Reveal>
  );
}

/** Linha de progresso (6 px) ligada à rolagem (`view()`, da entrada 10% até 55% da cobertura). Sem suporte: cheia. Decorativa. */
export function ProgressLine() {
  return (
    <span aria-hidden="true" className="block h-1.5 overflow-hidden rounded-[3px] bg-border">
      <span className="mk-growx block h-1.5 rounded-[3px] bg-primary" />
    </span>
  );
}
