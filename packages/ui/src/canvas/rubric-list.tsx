import { clsx } from 'clsx';

/**
 * RubricList: critérios da rubrica do card. Cada item é uma linha com tag "Essencial" (tint + primary-deep) ou
 * "Opcional" (neutra). `header` opcional: selo (ex.: "Aprovada") + meta ("v1.2 · usada na correção por IA").
 * Rótulos das tags por props. Lista semântica (`<ul>`).
 */
export type RubricListProps = {
  items: readonly { text: string; essential: boolean }[];
  essentialLabel: string;
  optionalLabel: string;
  header?: { badge: string; meta: string };
  'aria-label'?: string;
};

export function RubricList({ items, essentialLabel, optionalLabel, header, 'aria-label': ariaLabel }: RubricListProps) {
  return (
    <div className="flex flex-col gap-4">
      {header ? (
        <p className="m-0 flex items-center gap-2">
          <span className="rounded-pill bg-primary-tint px-2.5 py-1 text-xs font-bold text-primary-deep">{header.badge}</span>
          <span className="text-[13px] text-muted">{header.meta}</span>
        </p>
      ) : null}
      <ul aria-label={ariaLabel} className="m-0 flex list-none flex-col gap-2 p-0">
        {items.map((r) => (
          <li key={r.text} className="flex gap-2.5 rounded-[14px] border border-border p-3">
            <span className={clsx('flex h-[22px] shrink-0 items-center rounded-pill px-2 text-[11px] font-bold', r.essential ? 'bg-primary-tint text-primary-deep' : 'bg-(--cv-chip) text-muted')}>
              {r.essential ? essentialLabel : optionalLabel}
            </span>
            <span className="text-sm leading-[1.45]">{r.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
