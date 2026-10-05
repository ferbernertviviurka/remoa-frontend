import { focusRing } from '../button-styles';
import { Icon } from '../icons';

/** Progresso do mapa (no aside, FR-16): lembrança média, barra segmentada por estado, cobertura e CTA. Textos por props; números vêm do mesmo cálculo de /revisar. */
export type ProgressState = 'review' | 'watch' | 'steady' | 'unknown';
export type ProgressSegment = { state: ProgressState; count: number; label: string };
export type ProgressSummaryProps = {
  title: string;
  /** ex.: "42 cards" */
  countLabel?: string;
  /** 0–100 */
  average: number;
  averageLabel: string;
  segments: ProgressSegment[];
  coverage?: string;
  reviewLabel: string;
  onReview?: () => void;
  reviewHref?: string;
};

const bg: Record<ProgressState, string> = { review: 'bg-review', watch: 'bg-watch', steady: 'bg-steady', unknown: 'bg-unknown-soft' };

export function ProgressSummary({ title, countLabel, average, averageLabel, segments, coverage, reviewLabel, onReview, reviewHref }: ProgressSummaryProps) {
  const cta = `flex h-12 items-center justify-center gap-2 rounded-[15px] bg-primary font-extrabold text-on-primary no-underline hover:brightness-110 ${focusRing}`;
  const cls = `${cta} cursor-pointer border-0`;
  const inner = (<><Icon name="bolt" size={18} />{reviewLabel}</>);
  return (
    <section aria-label={title} className="flex flex-col gap-3 rounded-[24px] bg-canvas p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-[.12em] text-muted">{title}</h3>
        {countLabel ? <span className="text-[12.5px] text-muted">{countLabel}</span> : null}
      </div>
      <div className="flex items-baseline gap-2">
        <span className="font-display text-[44px] font-extrabold leading-none tracking-[-0.04em] text-primary-deep">{Math.round(average)}%</span>
        <span className="text-[13.5px] font-semibold text-ink-2">{averageLabel}</span>
      </div>
      <div aria-hidden="true" className="flex h-3 gap-0.5 overflow-hidden rounded-md bg-border">
        {segments.map((s) => (
          <span key={s.state} className={`basis-0 ${bg[s.state]}`} style={{ flexGrow: s.count }} />
        ))}
      </div>
      <ul className="m-0 grid list-none grid-cols-2 gap-x-3 gap-y-1.5 p-0">
        {segments.map((s) => (
          <li key={s.state} className="flex items-center gap-[7px] text-[13px] text-ink-2">
            <span aria-hidden="true" className={`size-2.5 rounded-[3px] ${bg[s.state]}`} />
            {s.count} {s.label}
          </li>
        ))}
      </ul>
      {coverage ? <p className="m-0 border-t border-border pt-2 text-[13px] text-ink-2">{coverage}</p> : null}
      {reviewHref ? <a href={reviewHref} onClick={onReview} className={cls}>{inner}</a> : <button type="button" onClick={onReview} className={cls}>{inner}</button>}
    </section>
  );
}
