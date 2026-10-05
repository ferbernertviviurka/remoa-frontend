'use client';

import { useState } from 'react';
import { ChartFrame, useRoving } from './shared';

/**
 * Heatmap (atividade, 15 semanas × 7 dias): grade em coluna (semana começa na segunda), células quadradas de raio 6, vão 5, 5 níveis
 * (0 = --divider … 4 = --primary). `cells` em ordem semana a semana (idx = semana*7 + dia), cada { id, level 0–4, label ("12 revisões em 3 de out"), future? }.
 * Futuras: borda tracejada, fora do foco. Hover/foco escreve a legenda do dia (`idleCaption` quando nada está ativo; região role=status).
 * Teclado: um Tab para o calendário; ↑↓ dia, ←→ semana, Home/End. Entrada em cascata (28 ms por coluna).
 * `lessLabel`/`moreLabel` na escala de níveis. `summary` obrigatório; tabela com `tableHeaders` [dia, atividade] (só dias não futuros).
 */
export type HeatCell = { id: string; level: 0 | 1 | 2 | 3 | 4; label: string; future?: boolean };
export type HeatmapProps = {
  cells: ReadonlyArray<HeatCell>;
  summary: string;
  idleCaption: string;
  lessLabel: string;
  moreLabel: string;
  tableHeaders: [string, string];
  tableToggleLabel?: string;
};

const LEVEL = ['var(--divider)', 'var(--heat-1)', 'var(--heat-2)', 'var(--heat-3)', 'var(--heat-4)'];

export function Heatmap({ cells, summary, idleCaption, lessLabel, moreLabel, tableHeaders, tableToggleLabel }: HeatmapProps) {
  const [active, setActive] = useState<number | null>(null);
  const past = cells.filter((c) => !c.future);
  const rove = useRoving(past.length, { hStep: 7, vStep: 1 });
  const idxOf = new Map(past.map((c, i) => [c.id, i]));
  return (
    <ChartFrame summary={summary} tableToggleLabel={tableToggleLabel} table={{ caption: summary, head: tableHeaders, rows: past.map((c) => [c.id, c.label]) }}>
      <div className="grid gap-[5px]" style={{ gridAutoFlow: 'column', gridTemplateRows: 'repeat(7, minmax(0, 1fr))', gridTemplateColumns: 'repeat(15, minmax(0, 1fr))' }}>
        {cells.map((c, n) => {
          const common = { 'data-level': c.level, className: 'rv-popn block aspect-square rounded-[6px] border-0 p-0', style: { background: LEVEL[c.level], animationDelay: `${28 * Math.floor(n / 7)}ms` } };
          if (c.future) return <span key={c.id} {...common} className="rv-popn block aspect-square rounded-[6px] border border-dashed border-border-strong" style={{ animationDelay: common.style.animationDelay }} aria-hidden="true" />;
          const i = idxOf.get(c.id) as number;
          const r = rove(i);
          return (
            <button
              key={c.id}
              type="button"
              aria-label={c.label}
              {...common}
              className={`${common.className} focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary ${active === i ? 'outline outline-2 outline-offset-1 outline-ink' : ''}`}
              tabIndex={r.tabIndex}
              ref={r.ref}
              onKeyDown={r.onKeyDown}
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => { setActive(i); r.onFocus(); }}
              onBlur={() => setActive(null)}
            />
          );
        })}
      </div>
      <div className="flex items-center justify-between gap-3">
        <span role="status" className="min-h-[22px] text-sm font-semibold text-ink-2">{active != null ? past[active]?.label : idleCaption}</span>
        <span aria-hidden="true" className="flex items-center gap-[5px] text-xs text-muted">
          {lessLabel}
          {LEVEL.map((bg) => <span key={bg} className="size-3.5 rounded-[4px]" style={{ background: bg }} />)}
          {moreLabel}
        </span>
      </div>
    </ChartFrame>
  );
}
