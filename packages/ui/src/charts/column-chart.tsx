'use client';

import { useState } from 'react';
import { ChartFrame, niceMax, tipClass } from './shared';

/**
 * ColumnChart (previsão de 14 dias): barras de raio 8 em cima, largura máx. 34 px, vão 8, plot de 220 px + rótulos de eixo.
 * Eixo Y arredondado a múltiplos de 5 (linhas 0, meio e topo). `items[i]` = { id, label (eixo, ex.: "ter"), full (ex.: "3 de out"),
 * value, highlight? (hoje: --primary; demais --state-steady-on-dark) }. `valueLabel(item)` = "12 cards" (nome acessível = `${valueLabel}, ${full}`).
 * Tooltip no hover e no foco (cada barra é um <button>, Tab entre barras). Barras crescem em 800 ms, 45 ms entre elas.
 * `summary` obrigatório; tabela alternativa com `tableHeaders` [dia, quantidade] (+ `tableToggleLabel` para mostrá-la). `emptyText` aparece quando tudo é 0.
 */
export type ColumnItem = { id: string; label: string; full: string; value: number; highlight?: boolean };
export type ColumnChartProps = {
  items: ReadonlyArray<ColumnItem>;
  summary: string;
  valueLabel: (item: ColumnItem) => string;
  tableHeaders: [string, string];
  tableToggleLabel?: string;
  emptyText?: string;
};

const H = 220;

export function ColumnChart({ items, summary, valueLabel, tableHeaders, tableToggleLabel, emptyText }: ColumnChartProps) {
  const [active, setActive] = useState<string | null>(null);
  const max = niceMax(Math.max(0, ...items.map((i) => i.value)));
  const empty = items.every((i) => i.value === 0);
  const ticks = [max, max / 2, 0];
  return (
    <ChartFrame summary={summary} tableToggleLabel={tableToggleLabel} table={{ caption: summary, head: tableHeaders, rows: items.map((i) => [i.full, valueLabel(i)]) }}>
      <div className="relative pl-[34px]" style={{ height: 250 }}>
        {ticks.map((t) => (
          <span key={t} aria-hidden="true" className="absolute inset-x-0 flex items-center gap-2 text-[11.5px] text-muted" style={{ top: ((max - t) / max) * H - 8 }}>
            <span className="w-[26px] text-right tabular-nums">{t}</span>
            <span className="h-px grow bg-divider" />
          </span>
        ))}
        <div className="absolute right-0 top-0 flex items-end gap-2" style={{ left: 34, height: H }}>
          {items.map((it, i) => {
            const h = it.value === 0 ? 2 : Math.max(8, (it.value / max) * H);
            return (
              <button
                key={it.id}
                type="button"
                aria-label={`${valueLabel(it)}, ${it.full}`}
                onMouseEnter={() => setActive(it.id)}
                onMouseLeave={() => setActive(null)}
                onFocus={() => setActive(it.id)}
                onBlur={() => setActive(null)}
                className="relative flex h-full min-w-0 flex-1 items-end justify-center rounded-[8px] border-0 bg-transparent p-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                {active === it.id ? (
                  <span role="presentation" className={tipClass} style={{ left: '50%', marginLeft: -62, bottom: h + 8, width: 124 }}>
                    <b>{valueLabel(it)}</b>
                    <br />
                    {it.full}
                  </span>
                ) : null}
                <span
                  aria-hidden="true"
                  data-testid="column-bar"
                  className="growy block w-full"
                  style={{ maxWidth: 34, height: h, borderRadius: '8px 8px 0 0', background: it.value === 0 ? 'var(--border)' : it.highlight ? 'var(--primary)' : 'var(--state-steady-on-dark)', animationDelay: `${120 + 45 * i}ms`, transition: 'background .2s ease' }}
                />
              </button>
            );
          })}
        </div>
        {empty && emptyText ? <p className="absolute inset-x-0 top-[90px] m-0 text-center text-sm text-muted" style={{ left: 34 }}>{emptyText}</p> : null}
        <div aria-hidden="true" className="absolute right-0 flex gap-2" style={{ left: 34, top: 226 }}>
          {items.map((it) => (
            <span key={it.id} className={`min-w-0 flex-1 text-center text-xs ${it.highlight ? 'font-bold text-ink' : 'text-muted'}`}>{it.label}</span>
          ))}
        </div>
      </div>
    </ChartFrame>
  );
}
