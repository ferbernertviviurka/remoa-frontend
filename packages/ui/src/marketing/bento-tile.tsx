import type { ReactNode } from 'react';
import { Reveal } from './reveal';

export type BentoTileProps = { title: string; text?: string; image?: ReactNode; children?: ReactNode; dark?: boolean };

/** Bloco de "E tem mais" com `lift` no hover. A grade (12 colunas, `col-span`) é do app: o tile preenche a célula. `image` é um nó (`<img>` com largura e altura). */
export function BentoTile({ title, text, image, children, dark = false }: BentoTileProps) {
  return (
    <Reveal>
      <article className={`lift flex h-full flex-col gap-5 rounded-[36px] p-6 md:p-[30px] ${dark ? 'bg-panel-dark text-on-dark' : 'border border-border bg-surface'}`}>
        <div className="flex flex-col gap-2">
          <h3 className="m-0 font-display text-[24px] font-extrabold tracking-[-0.03em] md:text-[28px]">{title}</h3>
          {text ? <p className={`m-0 max-w-[560px] text-base leading-[1.55] ${dark ? 'text-on-dark-muted-2' : 'text-muted'}`}>{text}</p> : null}
        </div>
        {image ? <div className="rounded-[26px] bg-canvas p-3 [&_img]:block [&_img]:h-auto [&_img]:w-full">{image}</div> : null}
        {children}
      </article>
    </Reveal>
  );
}
