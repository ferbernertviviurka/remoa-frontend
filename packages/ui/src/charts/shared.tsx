'use client';

import { useState, type KeyboardEvent, type ReactNode } from 'react';
import { focusRing } from '../button-styles';

/** Texto só para leitor de tela e tabela alternativa de um gráfico (FR-17). */
export type ChartTableData = { caption: string; head: string[]; rows: ReadonlyArray<ReadonlyArray<string | number>> };

/**
 * ChartFrame: `<figure aria-label={summary}>` + tabela equivalente. A tabela fica visualmente oculta; se `tableToggleLabel`
 * vier, aparece um botão (aria-expanded) que a mostra. Todo texto vem por props.
 */
export function ChartFrame({ summary, table, tableToggleLabel, children }: { summary: string; table: ChartTableData; tableToggleLabel?: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const visible = Boolean(tableToggleLabel) && open;
  return (
    <figure aria-label={summary} className="m-0 flex flex-col gap-2">
      {children}
      {tableToggleLabel ? (
        <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)} className={`flex h-11 items-center self-start rounded-[12px] px-3 text-[13.5px] font-bold text-primary-deep ${focusRing}`}>
          {tableToggleLabel}
        </button>
      ) : null}
      {/* sr-only on a `display: table` element does not shrink it (390 px overflow); the wrapper div does */}
      <div className={visible ? undefined : 'sr-only'}>
      <table className={visible ? 'w-full text-left text-sm text-ink' : undefined}>
        <caption className={visible ? 'pb-1 text-left text-[13px] text-muted' : undefined}>{table.caption}</caption>
        <thead>
          <tr>{table.head.map((h) => <th key={h} scope="col" className="py-1 pr-3 font-bold">{h}</th>)}</tr>
        </thead>
        <tbody>
          {table.rows.map((r, i) => (
            <tr key={i}>{r.map((c, j) => (j === 0 ? <th key={j} scope="row" className="py-1 pr-3 font-normal">{c}</th> : <td key={j} className="py-1 pr-3 tabular-nums">{c}</td>))}</tr>
          ))}
        </tbody>
      </table>
      </div>
    </figure>
  );
}

/** Eixo: teto arredondado para múltiplo de 5 (mínimo 5). */
export const niceMax = (max: number) => Math.max(5, Math.ceil(max / 5) * 5);

/** Tooltip escuro do mock (#1A1533, raio 12, 12,5 px). Decorativo: o nome acessível está no controle. */
export const tipClass = 'pop pointer-events-none absolute z-10 box-border rounded-[12px] bg-ink px-2.5 py-2 text-center text-[12.5px] leading-[1.35] text-on-dark';

/**
 * Foco itinerante (um só Tab para o gráfico): setas movem entre controles; `cols` = itens por coluna (7 no calendário: ↑↓ ±1, ←→ ±7).
 * `step` = tecla horizontal; vertical só se `cols>1`. Home/End. `refs` guarda os elementos para `.focus()`.
 */
export function useRoving(count: number, opts: { vStep?: number; hStep: number }) {
  const [cur, setCur] = useState(0);
  const refs: (HTMLElement | null)[] = [];
  const go = (i: number) => {
    const n = Math.min(count - 1, Math.max(0, i));
    setCur(n);
    refs[n]?.focus();
  };
  const onKeyDown = (i: number) => (e: KeyboardEvent) => {
    const { hStep, vStep } = opts;
    const d: Record<string, number | undefined> = { ArrowRight: hStep, ArrowLeft: -hStep, ArrowDown: vStep, ArrowUp: vStep ? -vStep : undefined };
    if (e.key === 'Home') { e.preventDefault(); go(0); }
    else if (e.key === 'End') { e.preventDefault(); go(count - 1); }
    else if (d[e.key] !== undefined) { e.preventDefault(); go(i + (d[e.key] as number)); }
  };
  const props = (i: number) => ({ tabIndex: i === Math.min(cur, count - 1) ? 0 : -1, onKeyDown: onKeyDown(i), onFocus: () => setCur(i), ref: (el: HTMLElement | null) => { refs[i] = el; } });
  return props;
}
