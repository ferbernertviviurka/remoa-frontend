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
};

export function MapCard({ label, typeLabel, title, openLabel, openAriaLabel, onOpen, state, stateLabel, selected }: MapCardProps) {
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
      <p className="mt-1.5 font-display text-sm font-bold leading-snug">{title}</p>
      <div className="mt-2 flex items-center justify-between gap-2">
        {state && stateLabel ? <Tag tone={state}>{stateLabel}</Tag> : <span />}
        <Button variant="quiet" aria-label={openAriaLabel} onClick={onOpen}>
          {openLabel}
        </Button>
      </div>
    </article>
  );
}
