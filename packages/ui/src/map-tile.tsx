import type { ComponentType, ReactNode } from 'react';
import { GraphPreview, type GraphPreviewProps } from './graph-preview';
import { StateBar, type StateBarProps } from './state-bar';
import { focusRing } from './button-styles';

/**
 * MapTile: cartão de mapa (Hoje: "Continue de onde parou"; Meus mapas). Raio 26, borda 1 px, padding 14, classe `lift` (sobe 3 px no hover).
 * Com `href` é um link inteiro (`as` troca por next/link); sem `href`, <article>. `aria-label` obrigatório quando é link ("Abrir o mapa Sepse").
 * Conteúdo: <GraphPreview> (`preview`), eyebrow da `area`, `title` (Bricolage 700), <StateBar> (`counts`, `stateBarLabel`), `meta` ("6 cards · 6 conexões"),
 * `due` = { text, tone } ("2 vencem hoje" tone review; "Em dia" tone unknown) e, em size = md, a linha `saved` ("Salvo há 3 min").
 * size = sm (Hoje: prévia 120 px, título 21 px) | md (Meus mapas: prévia 132 px, título 22 px, com `saved`).
 */
type LinkLike = ComponentType<{ href: string; 'aria-label'?: string; className?: string; children?: ReactNode }> | 'a';

export type MapTileProps = {
  area: string;
  title: string;
  preview: GraphPreviewProps['preview'];
  counts: StateBarProps['counts'];
  stateBarLabel: string;
  meta: string;
  due: { text: string; tone: 'review' | 'unknown' };
  saved?: string;
  size?: 'sm' | 'md';
  href?: string;
  as?: LinkLike;
  'aria-label'?: string;
};

export function MapTile({ area, title, preview, counts, stateBarLabel, meta, due, saved, size = 'sm', href, as, 'aria-label': ariaLabel }: MapTileProps) {
  const md = size === 'md';
  const className = `lift flex flex-col gap-3.5 rounded-list border border-border bg-surface p-3.5 text-ink no-underline ${focusRing}`;
  const body = (
    <>
      <GraphPreview preview={preview} height={md ? 132 : 120} />
      <div className={`flex flex-col px-1.5 pb-1.5 ${md ? 'gap-[9px]' : 'gap-2'}`}>
        <span className="text-xs font-bold uppercase tracking-[.12em] text-muted">{area}</span>
        <span className={`font-display font-bold leading-[1.15] tracking-[-0.02em] ${md ? 'text-[22px]' : 'text-[21px]'}`}>{title}</span>
        <StateBar counts={counts} aria-label={stateBarLabel} />
        <span className="flex items-center justify-between text-[13px] text-muted">
          <span>{meta}</span>
          <span className={`rounded-pill px-2.5 py-[3px] font-bold ${due.tone === 'review' ? 'bg-review-bg text-review-text' : 'bg-unknown-bg text-unknown-text'}`}>{due.text}</span>
        </span>
        {md && saved ? <span className="text-[13px] text-muted">{saved}</span> : null}
      </div>
    </>
  );
  if (href != null) {
    const As: LinkLike = as ?? 'a';
    return <As href={href} aria-label={ariaLabel} className={className}>{body}</As>;
  }
  return <article aria-label={ariaLabel} className={className}>{body}</article>;
}
