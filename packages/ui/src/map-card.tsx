import { memo } from 'react';
import { clsx } from 'clsx';
import { Button } from './button';
import { Tag } from './tag';

export type MapCardState = 'review' | 'watch' | 'steady' | 'unknown';

/** Class of the drag handle inside MapCard (React Flow: `dragHandle: '.' + mapCardDragHandle`). */
export const mapCardDragHandle = 'torph-map-card-drag';

const stateBorder: Record<MapCardState, string> = {
  review: 'border-review',
  watch: 'border-watch',
  steady: 'border-steady',
  unknown: 'border-unknown',
};

/**
 * MapCard: nó do canvas (216px, raio 15). `<article aria-label={label}>` com eyebrow do tipo, título,
 * rodapé de estado + borda 1,5px na cor do estado quando `state` vem (mapa de calor ligado),
 * `<button>` "Abrir" e uma alça de arraste separada (classe `mapCardDragHandle`). Todo texto vem por props.
 * Por tipo (F02): `summary` (conceito, 2 linhas), `meta` ("3 passos", "2 máscaras"), `chips` (etapas do caso),
 * `thumbnail` (imagem; `src: null` mostra um ícone até a URL chegar).
 */
export type MapCardProps = {
  label: string;
  typeLabel: string;
  title: string;
  openLabel: string;
  openAriaLabel: string;
  onOpen?: () => void;
  state?: MapCardState | null;
  stateLabel?: string;
  selected?: boolean;
  summary?: string | null;
  meta?: string | null;
  chips?: readonly string[];
  thumbnail?: { src: string | null; alt: string } | null;
};

export const MapCard = memo(function MapCard({
  label, typeLabel, title, openLabel, openAriaLabel, onOpen, state, stateLabel, selected, summary, meta, chips, thumbnail,
}: MapCardProps) {
  return (
    <article
      aria-label={label}
      className={clsx(
        'w-[216px] rounded-map border-[1.5px] bg-surface px-4 pb-3 pt-[15px] text-text shadow-card',
        state ? stateBorder[state] : 'border-border',
        selected && 'outline-2 outline-offset-2 outline-primary',
      )}
    >
      <div className={`${mapCardDragHandle} flex cursor-grab items-center justify-between gap-2 active:cursor-grabbing`}>
        <span className="text-[11px] font-bold uppercase tracking-[.13em] text-muted">{typeLabel}</span>
        <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" className="text-muted">
          {[3, 7, 11].flatMap((y) => [4, 10].map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.2" fill="currentColor" />))}
        </svg>
      </div>
      {thumbnail ? (
        <div className="mt-2 flex h-24 items-center justify-center overflow-hidden rounded-tag bg-canvas text-muted">
          {thumbnail.src ? (
            <img src={thumbnail.src} alt={thumbnail.alt} loading="lazy" draggable={false} className="h-full w-full object-cover" />
          ) : (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" role="img" aria-label={thumbnail.alt}>
              <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.6" />
              <circle cx="9" cy="10" r="2" stroke="currentColor" strokeWidth="1.6" />
              <path d="M4 18l5-5 4 4 3-3 4 4" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
            </svg>
          )}
        </div>
      ) : null}
      <p className="mt-1.5 font-display text-sm font-bold leading-snug">{title}</p>
      {summary ? <p className="mt-1 line-clamp-2 text-xs leading-snug text-muted">{summary}</p> : null}
      {chips?.length ? (
        <ul className="mt-2 flex flex-wrap gap-1">
          {chips.map((c) => (
            <li key={c}>
              <Tag tone="unknown">{c}</Tag>
            </li>
          ))}
        </ul>
      ) : null}
      {meta ? <p className="mt-1 text-xs font-semibold text-muted">{meta}</p> : null}
      <div className="mt-2 flex items-center justify-between gap-2">
        {state && stateLabel ? <Tag tone={state}>{stateLabel}</Tag> : <span />}
        <Button variant="quiet" aria-label={openAriaLabel} onClick={onOpen}>
          {openLabel}
        </Button>
      </div>
    </article>
  );
});
