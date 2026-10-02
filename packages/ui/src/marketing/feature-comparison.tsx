import type { ReactNode } from 'react';
import { Icon } from '../icons';

export type FeatureComparisonRow = { feature: string; cells: [ReactNode, ReactNode, ReactNode] };
export type FeatureComparisonProps = {
  caption: string;
  columns: [string, string, string];
  rows: FeatureComparisonRow[];
  /** Coluna destacada (0 = primeira coluna de dados, a do Remoa). */
  highlightColumn?: number;
  /** Rótulo da região rolável no celular. */
  scrollLabel: string;
  /** Texto do cabeçalho da coluna de recursos; sem ele fica oculto (só leitor de tela, igual à legenda). */
  featureHeader?: string;
};

/**
 * Tabela semântica de comparação (`<table>` + `<th scope>`), coluna destacada com a cor da marca.
 * No celular a tabela rola na horizontal dentro de uma região focável (`tabindex=0`) com rótulo.
 * Células: use `CompareMark` para o ícone (tem texto para leitor de tela).
 */
export function FeatureComparison({ caption, columns, rows, highlightColumn = 0, scrollLabel, featureHeader }: FeatureComparisonProps) {
  return (
    <div role="region" aria-label={scrollLabel} tabIndex={0} className="overflow-x-auto rounded-[34px] border border-border bg-surface px-3 pb-3 pt-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary md:px-6">
      <table className="w-full min-w-[640px] border-separate border-spacing-0 text-left">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            <th scope="col" className="h-16 p-0 pl-1.5 align-bottom text-left text-sm font-bold text-muted"><span className={featureHeader ? 'pb-4' : 'sr-only'}>{featureHeader ?? caption}</span></th>
            {columns.map((c, i) => (
              <th key={c} scope="col" className={`w-[19%] ${i === highlightColumn ? 'rounded-t-[18px] bg-primary font-display text-xl font-extrabold text-on-primary' : 'pb-4 align-bottom font-bold text-muted'}`}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.feature}>
              <th scope="row" className="h-[62px] border-t border-divider pl-1.5 text-left text-base font-semibold text-ink">{r.feature}</th>
              {r.cells.map((cell, i) => (
                <td key={i} className={`h-[62px] border-t border-divider text-center ${i === highlightColumn ? 'bg-primary-tint' : ''}`}>
                  <span className="flex items-center justify-center">{cell}</span>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Marca de célula: `brand` (círculo da cor da marca), `yes` (círculo escuro), `no` (traço). `label` é o texto para leitor de tela. */
export function CompareMark({ kind, label }: { kind: 'brand' | 'yes' | 'no'; label: string }) {
  if (kind === 'no') return <span className="block h-0.5 w-3.5 rounded-[1px] bg-unknown-soft"><span className="sr-only">{label}</span></span>;
  return (
    <span className={`flex size-[30px] items-center justify-center rounded-full text-on-dark ${kind === 'brand' ? 'bg-primary text-on-primary' : 'bg-panel-dark'}`}>
      <Icon name="check" size={16} /><span className="sr-only">{label}</span>
    </span>
  );
}
