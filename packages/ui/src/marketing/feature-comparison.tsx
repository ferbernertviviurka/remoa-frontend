import type { ReactNode } from 'react';
import { Icon } from '../icons';

export type FeatureComparisonRow = { feature: string; cells: [ReactNode, ReactNode, ReactNode] };
export type FeatureComparisonProps = {
  caption: string;
  /** Cabeçalhos das colunas de dados (texto ou nó, ex.: logo + nome). */
  columns: [ReactNode, ReactNode, ReactNode];
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
 * No celular a tabela vai de ponta a ponta (sai do respiro da `Section`, sem cantos nem bordas laterais) e rola na horizontal
 * dentro de uma região focável (`tabindex=0`) com rótulo; a coluna de recursos recua 16 px para alinhar com o texto da página.
 * Células: use `CompareMark` para o ícone (tem texto para leitor de tela).
 */
export function FeatureComparison({ caption, columns, rows, highlightColumn = 0, scrollLabel, featureHeader }: FeatureComparisonProps) {
  return (
    <div role="region" aria-label={scrollLabel} tabIndex={0} className="-mx-4 overflow-x-auto border-y border-border bg-surface pb-3 pt-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary md:mx-0 md:rounded-[34px] md:border md:px-6">
      <table className="w-full min-w-[640px] border-separate border-spacing-0 text-left">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            <th scope="col" className="h-16 p-0 pl-4 align-bottom md:pl-1.5 text-left text-sm font-bold text-muted"><span className={featureHeader ? 'pb-4' : 'sr-only'}>{featureHeader ?? caption}</span></th>
            {columns.map((c, i) => (
              <th key={i} scope="col" className={`w-[19%] text-center ${i === highlightColumn ? 'rounded-t-[18px] bg-primary align-middle font-display text-xl font-extrabold text-on-primary' : 'pb-4 align-bottom font-bold text-muted'}`}>
                <span className="inline-flex items-center justify-center gap-2">{c}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.feature}>
              <th scope="row" className="h-[62px] border-t border-divider pl-4 pr-3 text-left md:pl-1.5 md:pr-0 text-base font-semibold text-ink">{r.feature}</th>
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
