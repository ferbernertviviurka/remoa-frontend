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
  description?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  progress?: { value: number; max: number; title: string; caption: string };
};

export function Hero({ eyebrow, title, description, actions, children, progress }: HeroProps) {
  const id = useId();
  return (
    <section aria-labelledby={id} className="relative flex flex-col overflow-hidden rounded-hero bg-panel-dark text-on-dark xl:h-[300px] xl:flex-row">
      <div className="flex min-w-0 grow flex-col gap-3 px-5 py-6 sm:py-8 sm:pl-[38px] sm:pr-6 xl:pr-3">
        <span className="text-xs font-bold uppercase tracking-[.12em] text-on-dark-muted">{eyebrow}</span>
        <h2 id={id} className="m-0 font-display text-[28px] font-extrabold leading-[1.08] tracking-[-0.03em] sm:text-[36px]">{title}</h2>
        {description ? <div className="m-0 max-w-[380px] text-[15px] leading-normal text-on-dark-muted-2">{description}</div> : null}
        {actions ? <div className="mt-auto flex flex-wrap gap-3 pt-2 max-sm:[&>button]:w-full">{actions}</div> : null}
      </div>
      <div className="relative shrink-0 max-xl:px-5 max-xl:pb-5 sm:max-xl:pl-[38px]">
        {/* A constelação (380 × 300) só cabe ao lado do texto a partir de xl; abaixo disso some e o chip de progresso entra no fluxo. */}
        <div className="hidden xl:block">{children}</div>
        {progress ? (
          <div className="flex w-fit max-w-full items-center gap-3 rounded-[20px] bg-white/10 py-3 pl-3 pr-[18px] xl:absolute xl:bottom-6 xl:right-6">
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
