'use client';

import type { ReactNode } from 'react';
import { Button, focusRing } from '../button';
import { Icon } from '../icons';
import { SkeletonBlock } from '../skeleton';

export type DataColumn<T> = {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  align?: 'left' | 'right';
  /** coluna que carrega o botão de seleção da linha (padrão: a primeira) */
  primary?: boolean;
};

export type DataTablePagination = {
  /** página atual, a partir de 1 */
  page: number;
  /** padrão 25 (FR-22) */
  pageSize?: number;
  total: number;
  onPageChange: (page: number) => void;
  /** "Mostrando 1–25 de 112" (já formatado) */
  summary: string;
  navLabel: string;
  prevLabel: string;
  nextLabel: string;
};

/**
 * DataTable (F19 FR-14..FR-23): tabela semântica (`<table>` com `<caption>` só para leitor de tela, `<th scope="col">`). Cabeçalho em caixa-alta 12 px/700 sobre --canvas; linhas de 68 px+, hover lilás.
 * Genérica: `columns[{key, header, cell(row)}]`, `rows`, `rowKey`. Com `onRowSelect`, a coluna principal vira um botão (`aria-pressed` = linha da gaveta aberta; `rowLabel(row)` = rótulo acessível) e a linha inteira é clicável.
 * `status`: `ready` | `loading` (linhas de esqueleto, `aria-busy`) | `error` (alerta com "Tentar de novo") | linhas vazias = `emptyText`. Entrada das linhas: `slide` com `staggerMs` (padrão 70 ms, só as 10 primeiras; 0 desliga).
 * `pagination` (25 por página) mostra "Mostrando…" e Anterior/Próxima abaixo. `flush` tira a borda e o raio (tabela dentro de AdminSection). Busca e filtros são do servidor: a tabela só exibe o que recebe.
 */
export type DataTableProps<T> = {
  caption: string;
  columns: ReadonlyArray<DataColumn<T>>;
  rows: ReadonlyArray<T>;
  rowKey: (row: T) => string;
  status?: 'ready' | 'loading' | 'error';
  loadingLabel?: string;
  emptyText: string;
  errorText?: string;
  retryLabel?: string;
  onRetry?: () => void;
  onRowSelect?: (row: T) => void;
  selectedKey?: string | null;
  rowLabel?: (row: T) => string;
  pagination?: DataTablePagination;
  staggerMs?: number;
  flush?: boolean;
};

export function DataTable<T>({ caption, columns, rows, rowKey, status = 'ready', loadingLabel, emptyText, errorText, retryLabel, onRetry, onRowSelect, selectedKey, rowLabel, pagination, staggerMs = 70, flush }: DataTableProps<T>) {
  const primary = Math.max(0, columns.findIndex((c) => c.primary));
  const span = columns.length;
  const th = 'whitespace-nowrap px-5 py-3.5 text-xs font-bold uppercase tracking-[0.1em] text-muted';
  const total = pagination ? Math.max(1, Math.ceil(pagination.total / (pagination.pageSize ?? 25))) : 1;
  return (
    <div className={flush ? '' : 'overflow-hidden rounded-[28px] border border-border bg-surface'}>
      <div className="overflow-x-auto" role="region" aria-label={caption} tabIndex={0}>
        <table aria-busy={status === 'loading' || undefined} className="w-full border-collapse text-left">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr className="bg-canvas">
              {columns.map((c) => (
                <th key={c.key} scope="col" className={`${th} ${c.align === 'right' ? 'text-right' : ''}`}>{c.header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {status === 'loading'
              ? Array.from({ length: 5 }, (_, i) => (
                  <tr key={i} className="border-t border-divider">
                    {columns.map((c) => (
                      <td key={c.key} className="h-[68px] px-5 py-1.5"><SkeletonBlock height={14} width={i % 2 ? '70%' : '90%'} radius={7} /></td>
                    ))}
                  </tr>
                ))
              : status === 'error'
                ? (
                  <tr className="border-t border-divider">
                    <td colSpan={span} className="px-5 py-10 text-center">
                      <div role="alert" className="flex flex-col items-center gap-3 text-review-text">
                        <span className="flex items-center gap-2 font-semibold"><Icon name="warning" size={20} />{errorText}</span>
                        {onRetry ? <Button variant="secondary" size="sm" onClick={onRetry}>{retryLabel}</Button> : null}
                      </div>
                    </td>
                  </tr>
                )
                : rows.length === 0
                  ? (
                    <tr className="border-t border-divider"><td colSpan={span} className="px-5 py-10 text-center text-muted">{emptyText}</td></tr>
                  )
                  : rows.map((row, i) => {
                      const key = rowKey(row);
                      const on = selectedKey === key;
                      return (
                        <tr
                          key={key}
                          data-selected={on || undefined}
                          onClick={onRowSelect ? () => onRowSelect(row) : undefined}
                          style={staggerMs && i < 10 ? { animationDelay: `${i * staggerMs}ms` } : undefined}
                          className={`${staggerMs ? 'slide ' : ''}border-t border-divider transition-colors duration-200 ${onRowSelect ? 'cursor-pointer hover:bg-canvas' : ''} ${on ? 'bg-primary-tint' : ''}`}
                        >
                          {columns.map((c, ci) => (
                            <td key={c.key} className={`h-[68px] px-5 py-1.5 align-middle text-[14.5px] ${c.align === 'right' ? 'text-right' : ''}`}>
                              {onRowSelect && ci === primary ? (
                                <button type="button" aria-pressed={on} aria-label={rowLabel?.(row)} onClick={(e) => { e.stopPropagation(); onRowSelect(row); }} className={`m-0 flex min-h-11 w-full cursor-pointer items-center border-0 bg-transparent p-0 text-left text-inherit ${focusRing}`}>
                                  {c.cell(row)}
                                </button>
                              ) : c.cell(row)}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
          </tbody>
        </table>
      </div>
      {status === 'loading' && loadingLabel ? <p role="status" className="sr-only">{loadingLabel}</p> : null}
      {pagination ? (
        <nav aria-label={pagination.navLabel} className="flex items-center justify-between gap-3 border-t border-divider px-5 py-3">
          <span aria-live="polite" className="text-[13.5px] text-muted">{pagination.summary}</span>
          <span className="flex gap-2">
            <Button variant="secondary" size="sm" disabled={pagination.page <= 1} onClick={() => pagination.onPageChange(pagination.page - 1)}>{pagination.prevLabel}</Button>
            <Button variant="secondary" size="sm" disabled={pagination.page >= total} onClick={() => pagination.onPageChange(pagination.page + 1)}>{pagination.nextLabel}</Button>
          </span>
        </nav>
      ) : null}
    </div>
  );
}

/** PersonCell: iniciais em círculo (38–40 px) + nome (700) e subtítulo (e-mail, ID) com reticências. Vai na coluna principal da DataTable. `avatar={false}` para coisas que não são pessoas (mapas): só as duas linhas. */
export function PersonCell({ name, sub, avatar = true }: { name: string; sub?: string; avatar?: boolean }) {
  const ini = name.split(' ').filter(Boolean).slice(0, 2).map((p) => p.charAt(0)).join('').toUpperCase();
  return (
    <span className="flex min-w-0 items-center gap-3">
      {avatar ? <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-full bg-chip font-display text-[15px] font-extrabold text-primary-deep">{ini}</span> : null}
      <span className="flex min-w-0 flex-col leading-[1.3]">
        <span className="truncate font-bold">{name}</span>
        {sub ? <span className="truncate text-[13px] text-muted">{sub}</span> : null}
      </span>
    </span>
  );
}
