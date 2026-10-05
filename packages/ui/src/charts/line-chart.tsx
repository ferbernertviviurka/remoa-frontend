'use client';

import { useState } from 'react';
import { ChartFrame, tipClass, useRoving } from './shared';

/**
 * LineChart (retenção 7/30/90): linha de 3,5 px + área --primary-tint, plot 220 px, linha tracejada de meta opcional.
 * `points[i]` = { id, value, date (texto já formatado, ex.: "3 out") }; `valueLabel(p)` = "87%" (nome acessível = `${valueLabel}, ${date}`).
 * Eixo Y: `yMin`/`yMax` (padrão 0–100) e `yTicks` (rótulos `formatTick`); `target` = { value, label } desenha a meta tracejada.
 * Hover/foco mostra guia vertical, marcador e dica. Um Tab para o gráfico; ← → Home End movem entre pontos (foco itinerante).
 * A linha se desenha em 1,4 s (stroke-dashoffset), a área surge em 1 s. `fromLabel` (esquerda, ex.: "há 30 dias") e `toLabel` ("hoje") no eixo X.
 * Troque o período pelo `Segmented` e passe outros `points`; use `animationKey` para reanimar. `summary` obrigatório; tabela com `tableHeaders` [data, valor].
 */
export type LinePoint = { id: string; value: number; date: string };
export type LineChartProps = {
  points: ReadonlyArray<LinePoint>;
  summary: string;
  valueLabel: (p: LinePoint) => string;
  tableHeaders: [string, string];
  tableToggleLabel?: string;
  yTicks?: number[];
  formatTick?: (v: number) => string;
  yMin?: number;
  yMax?: number;
  target?: { value: number; label: string };
  fromLabel: string;
  toLabel: string;
  emptyText?: string;
  animationKey?: string | number;
};

const H = 220;
const W = 600;

export function LineChart({ points, summary, valueLabel, tableHeaders, tableToggleLabel, yTicks = [0, 50, 100], formatTick = String, yMin = 0, yMax = 100, target, fromLabel, toLabel, emptyText, animationKey }: LineChartProps) {
  const [hover, setHover] = useState<number | null>(null);
  const rove = useRoving(points.length, { hStep: 1 });
  const y = (v: number) => H - ((Math.min(yMax, Math.max(yMin, v)) - yMin) / (yMax - yMin)) * H;
  const x = (i: number) => (points.length < 2 ? W / 2 : (i / (points.length - 1)) * W);
  const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(p.value).toFixed(1)}`).join(' ');
  const area = points.length ? `${line} L${x(points.length - 1).toFixed(1)} ${H} L${x(0).toFixed(1)} ${H} Z` : '';
  const hp = hover != null ? points[hover] : undefined;
  const hx = hover != null ? (points.length < 2 ? 50 : (hover / (points.length - 1)) * 100) : 0;
  const hy = hp ? y(hp.value) : 0;
  const shift = hx > 82 ? '-100%' : hx < 14 ? '0%' : '-50%';
  return (
    <ChartFrame summary={summary} tableToggleLabel={tableToggleLabel} table={{ caption: summary, head: tableHeaders, rows: points.map((p) => [p.date, valueLabel(p)]) }}>
      <div className="relative pl-10" style={{ height: 250 }}>
        {yTicks.map((t) => {
          const isT = target?.value === t;
          return (
            <span key={t} aria-hidden="true" className={`absolute inset-x-0 flex items-center gap-2 text-[11.5px] ${isT ? 'font-bold text-ink' : 'text-muted'}`} style={{ top: y(t) - 8 }}>
              <span className="w-8 text-right tabular-nums">{formatTick(t)}</span>
              <span className={`h-0 grow border-t ${isT ? 'border-dashed border-ink-2' : 'border-divider'}`} />
            </span>
          );
        })}
        {target && !yTicks.includes(target.value) ? (
          <span aria-hidden="true" className="absolute inset-x-0 flex items-center gap-2 text-[11.5px] font-bold text-ink" style={{ top: y(target.value) - 8 }}>
            <span className="w-8 text-right tabular-nums">{target.label}</span>
            <span className="h-0 grow border-t border-dashed border-ink-2" />
          </span>
        ) : null}
        <div key={animationKey} className="absolute right-0 top-0" style={{ left: 40, height: H }}>
          <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" fill="none" aria-hidden="true">
            {points.length ? (
              <>
                <path d={area} fill="var(--primary-tint)" className="rv-area" />
                <path data-testid="line-path" d={line} pathLength={1} stroke="var(--primary)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" className="rv-line" />
              </>
            ) : null}
          </svg>
          {hp ? (
            <>
              <span aria-hidden="true" className="pointer-events-none absolute top-0 w-0 border-l-[1.5px] border-dashed border-muted" style={{ left: `${hx}%`, height: H }} />
              <span aria-hidden="true" className="pointer-events-none absolute size-3.5 rounded-full border-[3.5px] border-primary bg-surface" style={{ left: `${hx}%`, top: hy, margin: '-7px 0 0 -7px' }} />
              <span role="presentation" className={tipClass} style={{ left: `${hx}%`, top: Math.max(0, hy - 66), transform: `translateX(${shift})`, width: 128 }}>
                <b>{valueLabel(hp)}</b>
                <br />
                {hp.date}
              </span>
            </>
          ) : null}
          <div className="absolute inset-0 flex">
            {points.map((p, i) => (
              <button
                key={p.id}
                type="button"
                aria-label={`${valueLabel(p)}, ${p.date}`}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => { setHover(i); rove(i).onFocus(); }}
                onBlur={() => setHover(null)}
                tabIndex={rove(i).tabIndex}
                onKeyDown={rove(i).onKeyDown}
                ref={rove(i).ref}
                className="h-full min-w-0 flex-1 border-0 bg-transparent p-0 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary"
              />
            ))}
          </div>
          {points.length === 0 && emptyText ? <p className="absolute inset-x-0 top-[90px] m-0 text-center text-sm text-muted">{emptyText}</p> : null}
        </div>
        <div aria-hidden="true" className="absolute right-0 flex justify-between text-xs text-muted" style={{ left: 40, top: 228 }}>
          <span>{fromLabel}</span>
          <span>{toLabel}</span>
        </div>
      </div>
    </ChartFrame>
  );
}
