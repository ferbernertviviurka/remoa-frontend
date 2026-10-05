'use client';

import { useState } from 'react';
import { ChartFrame } from './shared';

/**
 * Donut (estado dos cards): rosca 200 px, raio 70, traço 24 (30 no trecho ativo); cada trecho se desenha em 1 s (200 ms + 160 ms por trecho).
 * `segments[i]` = { id, label, value, color (css) }. Legenda interativa (botões de 44 px): hover/foco destaca o trecho (os outros vão a 20%)
 * e o centro troca para o número e o rótulo do trecho; fora disso mostra `total` (padrão: soma) e `totalLabel`.
 * `summary` obrigatório (figure); tabela alternativa com `tableHeaders` [estado, quantidade]. Total 0: só o trilho + `emptyText` no centro.
 */
export type DonutSegment = { id: string; label: string; value: number; color: string };
export type DonutProps = { segments: ReadonlyArray<DonutSegment>; summary: string; totalLabel: string; tableHeaders: [string, string]; tableToggleLabel?: string; emptyText?: string };

const R = 70;
const C = 2 * Math.PI * R;

export function Donut({ segments, summary, totalLabel, tableHeaders, tableToggleLabel, emptyText }: DonutProps) {
  const [active, setActive] = useState<string | null>(null);
  const total = segments.reduce((a, s) => a + Math.max(0, s.value), 0);
  const act = segments.find((s) => s.id === active);
  let acc = 0;
  const arcs = segments.map((s, i) => {
    const len = total > 0 ? (Math.max(0, s.value) / total) * C : 0;
    const start = acc;
    acc += len;
    return { s, len, rot: -90 + (start / C) * 360, i };
  });
  const big = total === 0 ? '0' : act ? String(act.value) : String(total);
  const small = total === 0 ? (emptyText ?? totalLabel) : act ? act.label : totalLabel;
  return (
    <ChartFrame summary={summary} tableToggleLabel={tableToggleLabel} table={{ caption: summary, head: tableHeaders, rows: segments.map((s) => [s.label, s.value]) }}>
      <div className="flex items-center gap-[26px]">
        <div className="relative size-[200px] shrink-0">
          <svg width="200" height="200" viewBox="0 0 200 200" fill="none" aria-hidden="true">
            <circle cx="100" cy="100" r={R} stroke="var(--divider)" strokeWidth="24" />
            {arcs.filter((a) => a.len > 0).map((a) => (
              <circle
                key={a.s.id}
                data-segment={a.s.id}
                className="rv-seg"
                cx="100"
                cy="100"
                r={R}
                stroke={a.s.color}
                strokeWidth={active === a.s.id ? 30 : 24}
                transform={`rotate(${a.rot.toFixed(2)} 100 100)`}
                style={{ strokeDasharray: `${a.len.toFixed(2)} ${C.toFixed(2)}`, ['--len' as string]: a.len.toFixed(2), opacity: active && active !== a.s.id ? 0.2 : 1, animationDelay: `${200 + 160 * a.i}ms`, transition: 'opacity .25s ease, stroke-width .25s ease' }}
              />
            ))}
          </svg>
          <span className="absolute inset-0 flex flex-col items-center justify-center text-center leading-[1.1]">
            <span className="font-display text-[40px] font-extrabold tracking-[-.04em] tabular-nums text-ink">{big}</span>
            <span className="max-w-[110px] text-[13px] text-muted">{small}</span>
          </span>
        </div>
        <ul className="m-0 flex grow list-none flex-col gap-1.5 p-0">
          {segments.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onMouseEnter={() => setActive(s.id)}
                onMouseLeave={() => setActive(null)}
                onFocus={() => setActive(s.id)}
                onBlur={() => setActive(null)}
                className={`flex min-h-11 w-full items-center gap-2.5 rounded-[12px] border-0 px-2.5 text-left transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${active === s.id ? 'bg-canvas' : 'bg-transparent'}`}
              >
                <span aria-hidden="true" className="size-3 shrink-0 rounded-[4px]" style={{ background: s.color }} />
                <span className="grow text-[14.5px] font-semibold text-ink">{s.label}</span>
                <span className="font-extrabold tabular-nums text-ink">{s.value}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </ChartFrame>
  );
}
