import type { ReactNode } from 'react';
import { Reveal } from './reveal';

export type SectionTone = 'surface' | 'canvas' | 'dark';
export type SectionProps = { id: string; eyebrow?: string; title: string; lead?: string; children?: ReactNode; tone?: SectionTone };

const TONE: Record<SectionTone, { box: string; eyebrow: string; lead: string }> = {
  canvas: { box: 'pt-20 md:pt-[140px]', eyebrow: 'text-muted', lead: 'text-muted' },
  surface: { box: 'mt-20 border-y border-border bg-surface py-20 md:mt-[150px] md:pt-[110px] md:pb-[120px]', eyebrow: 'text-muted', lead: 'text-muted' },
  dark: { box: 'mt-20 bg-panel-dark py-20 text-on-dark md:mt-[150px] md:pt-[110px] md:pb-[120px]', eyebrow: 'text-on-dark-muted', lead: 'text-on-dark-muted-2' },
};

/** Seção da landing. Contêiner de 1280 px com 40 px de respiro, `scroll-margin-top: 92px` (cabeçalho de 76 px) e título `h2` com id `${id}-title` ligado por `aria-labelledby`. */
export function Section({ id, eyebrow, title, lead, children, tone = 'canvas' }: SectionProps) {
  const t = TONE[tone];
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={`scroll-mt-[92px] ${t.box}`}>
      <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-10 px-4 md:gap-12 md:px-10">
        <Reveal>
          <div className="flex max-w-[820px] flex-col gap-3.5">
            {eyebrow ? <span className={`text-xs font-bold uppercase tracking-[0.12em] ${t.eyebrow}`}>{eyebrow}</span> : null}
            <h2 id={`${id}-title`} className="m-0 font-display text-[34px] leading-[1.05] font-extrabold tracking-[-0.035em] md:text-[44px] lg:text-[56px]">{title}</h2>
            {lead ? <p className={`m-0 text-[17px] leading-normal md:text-[19px] ${t.lead}`}>{lead}</p> : null}
          </div>
        </Reveal>
        {children}
      </div>
    </section>
  );
}
