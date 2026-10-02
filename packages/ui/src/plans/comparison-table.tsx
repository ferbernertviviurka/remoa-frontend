import type { ReactNode } from 'react';
import { UsageCaption } from './usage-caption';

/**
 * ComparisonTable (F15 FR-4): `<table>` semântica (`th scope="col"` / `th scope="row"`). Colunas Free e Pro; Pro em tint.
 * `cornerLabel` = texto (visualmente oculto) do canto; `freeHeader`/`proHeader` = `PlanColumnHeader`. `current` = coluna que mostra o uso.
 * Linha: barra Pro sempre cheia; barra Free curta (`freeBar` %, padrão 12, ilustrativa; `unlimited` marca a linha). Barras `fillx` 900 ms; linhas `slide` em cascata de 70 ms.
 * `usage` aparece só na coluna `current`. Sem movimento: `data-motion="reduced"`.
 */
export type ComparisonRow = {
  id: string;
  label: string;
  sub?: string;
  free: string;
  pro: string;
  unlimited?: boolean;
  freeBar?: number;
  usage?: { text: string; tone?: 'normal' | 'warn' | 'danger' };
};
export type ComparisonTableProps = {
  caption: string;
  cornerLabel: string;
  freeHeader: ReactNode;
  proHeader: ReactNode;
  rows: ComparisonRow[];
  current: 'free' | 'pro';
};

const CASCADE = 70;

/** Grade do Planos.dc.html: 1,1fr 1fr 1fr, vão de 12 px. `display: grid` tira a semântica de tabela dos navegadores, então os papéis ARIA ficam explícitos. */
const GRID = 'grid grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,1fr)] gap-3';

export function ComparisonTable({ caption, cornerLabel, freeHeader, proHeader, rows, current }: ComparisonTableProps) {
  return (
    <table role="table" className="block w-full text-left">
      <caption className="sr-only">{caption}</caption>
      <thead role="rowgroup" className="block">
        <tr role="row" className={`${GRID} items-stretch`}>
          <th role="columnheader" scope="col"><span className="sr-only">{cornerLabel}</span></th>
          <th role="columnheader" scope="col" className="p-0 font-normal">{freeHeader}</th>
          <th role="columnheader" scope="col" className="p-0 font-normal">{proHeader}</th>
        </tr>
      </thead>
      <tbody role="rowgroup" className="block">
        {rows.map((r, i) => {
          const delay = `${i * CASCADE}ms`;
          const freePct = r.freeBar ?? 12;
          return (
            <tr key={r.id} role="row" data-unlimited={r.unlimited || undefined} className={`slide ${GRID} mt-3 border-t border-divider pt-3`} style={{ animationDelay: delay }}>
              <th role="rowheader" scope="row" className="flex flex-col justify-center gap-0.5 rounded-[14px] px-1.5 py-2 text-left font-normal">
                <span className="block text-base font-bold text-ink">{r.label}</span>
                {r.sub ? <span className="block text-[13px] text-muted">{r.sub}</span> : null}
              </th>
              <td role="cell" className="py-3.5 pl-1.5 pr-1 align-top">
                <span className="block font-display text-[23px] font-extrabold leading-[1.1] tracking-[-0.02em] text-ink">{r.free}</span>
                <Bar pct={freePct} color="bg-border-strong" track="bg-border" delay={delay} />
                {current === 'free' && r.usage ? <UsageCaption tone={r.usage.tone}>{r.usage.text}</UsageCaption> : null}
              </td>
              <td role="cell" className="rounded-[18px] bg-primary-tint px-4 py-3.5 align-top">
                <span className="block font-display text-[23px] font-extrabold leading-[1.1] tracking-[-0.02em] text-primary-deep">{r.pro}</span>
                <Bar pct={100} color="bg-primary" track="bg-surface" delay={delay} />
                {current === 'pro' && r.usage ? <UsageCaption tone={r.usage.tone}>{r.usage.text}</UsageCaption> : null}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function Bar({ pct, color, track, delay }: { pct: number; color: string; track: string; delay: string }) {
  return (
    <span aria-hidden="true" className={`mt-2.5 block h-2 overflow-hidden rounded-[4px] ${track}`}>
      <span data-testid="cmp-fill" className={`fillx block h-2 w-full rounded-[4px] ${color}`} style={{ transform: `scaleX(${pct / 100})`, animationDelay: delay }} />
    </span>
  );
}
