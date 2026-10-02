'use client';

import { useId, type ReactNode } from 'react';
import { Ring } from './ring';

/**
 * Hero: painel escuro do Hoje (300 px de altura, raio 30, fundo --panel-dark). `<section aria-labelledby>` com o `title` como h2.
 * Coluna esquerda: `eyebrow` (12 px caixa alta), `title` (Bricolage 800 36 px), `description` (15 px, máx. 380 px) e `actions` (ReactNode, no rodapé;
 * use <Button variant="light" size="hero"> e <Button variant="outline-light" size="hero">).
 * Direita: `children` (ex.: <Constellation/>, 380 × 300) e `progress` (chip no canto inferior direito com <Ring/>):
 * { value, max, title: "3 de 15", caption: "revisados hoje" }.
 */
export type HeroProps = {
  eyebrow: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  children?: ReactNode;
  progress?: { value: number; max: number; title: string; caption: string };
};

export function Hero({ eyebrow, title, description, actions, children, progress }: HeroProps) {
  const id = useId();
  return (
    <section aria-labelledby={id} className="relative flex h-[300px] overflow-hidden rounded-hero bg-panel-dark text-on-dark">
      <div className="flex min-w-0 grow flex-col gap-3 py-8 pl-[38px] pr-3">
        <span className="text-xs font-bold uppercase tracking-[.12em] text-on-dark-muted">{eyebrow}</span>
        <h2 id={id} className="m-0 font-display text-[36px] font-extrabold leading-[1.08] tracking-[-0.03em]">{title}</h2>
        {description ? <p className="m-0 max-w-[380px] text-[15px] leading-normal text-on-dark-muted-2">{description}</p> : null}
        {actions ? <div className="mt-auto flex gap-3">{actions}</div> : null}
      </div>
      <div className="relative shrink-0">
        {children}
        {progress ? (
          <div className="absolute bottom-6 right-6 flex items-center gap-3 rounded-[20px] bg-white/10 py-3 pl-3 pr-[18px]">
            <Ring value={progress.value} max={progress.max} />
            <span className="flex flex-col leading-tight">
              <span className="font-display text-xl font-extrabold">{progress.title}</span>
              <span className="text-[13px] text-on-dark-muted">{progress.caption}</span>
            </span>
          </div>
        ) : null}
      </div>
    </section>
  );
}
