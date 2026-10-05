import { focusRing } from '../button-styles';
import { GraphPreview, type GraphPreviewProps } from '../graph-preview';
import { StateBar, type StateBarProps } from '../state-bar';
import type { SlideLink } from './link';

/**
 * MapSlideCard: cartão de mapa do carrossel "Continue de onde parou" (F14 FR-12). Altura exata de 312 px (igual aos cartões em branco e bloqueado), raio 26, padding 14, `lift`.
 * Conteúdo: <GraphPreview> (120 px), `area` (eyebrow), `title`, <StateBar> (`counts` + `stateBarLabel`), `meta` ("6 cards · 6 conexões") e chip `due` ({ text, tone: 'review' | 'unknown' }).
 * Todo texto vem por props. Sempre é link (`href`); `as` troca o elemento (PendingLink/next/link). `aria-label` obrigatório ("Abrir o mapa Sepse").
 */
export type MapSlideCardProps = {
  href: string;
  as?: SlideLink;
  'aria-label': string;
  area: string;
  title: string;
  preview: GraphPreviewProps['preview'];
  counts: StateBarProps['counts'];
  stateBarLabel: string;
  meta: string;
  due: { text: string; tone: 'review' | 'unknown' };
};

export function MapSlideCard({ href, as, 'aria-label': ariaLabel, area, title, preview, counts, stateBarLabel, meta, due }: MapSlideCardProps) {
  const As: SlideLink = as ?? 'a';
  return (
    <As href={href} aria-label={ariaLabel} className={`lift box-border flex h-[312px] flex-col gap-3 rounded-list border border-border bg-surface p-3.5 text-ink no-underline ${focusRing}`}>
      <GraphPreview preview={preview} height={120} />
      <div className="flex flex-col gap-2 px-1.5 pb-1.5">
        <span className="text-xs font-bold uppercase tracking-[.12em] text-muted">{area}</span>
        <span className="font-display text-[21px] font-bold leading-[1.15] tracking-[-0.02em]">{title}</span>
        <StateBar counts={counts} aria-label={stateBarLabel} />
        <span className="flex items-center justify-between gap-2 text-[13px] text-muted">
          <span>{meta}</span>
          <span className={`whitespace-nowrap rounded-pill px-2.5 py-[3px] font-bold ${due.tone === 'review' ? 'bg-review-bg text-review-text' : 'bg-unknown-bg text-unknown-text'}`}>{due.text}</span>
        </span>
      </div>
    </As>
  );
}
