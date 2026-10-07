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
  /** Rótulo da região da tabela (rola na horizontal só se a tela for estreita demais). */
  scrollLabel: string;
  /** Texto do cabeçalho da coluna de recursos; sem ele fica oculto (só leitor de tela, igual à legenda). */
  featureHeader?: string;
};

/**
 * Tabela semântica de comparação (`<table>` + `<th scope>`), coluna destacada com a cor da marca de ponta a ponta.
 * Cabe inteira a partir de 360 px (colunas de dados de 62 px no celular, recurso com o resto); abaixo disso rola na
 * horizontal dentro de uma região focável (`tabindex=0`) com rótulo.
 * Células: use `CompareMark` para o ícone (tem texto para leitor de tela).
 */
export function FeatureComparison({ caption, columns, rows, highlightColumn = 0, scrollLabel, featureHeader }: FeatureComparisonProps) {
  const last = rows.length - 1;
  return (
    <div role="region" aria-label={scrollLabel} tabIndex={0} className="overflow-x-auto rounded-[24px] border border-border bg-surface px-2 pb-2 shadow-[0_24px_48px_-32px_rgba(36,26,92,0.45)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary md:rounded-[34px] md:px-6 md:pb-6">
      <table className="w-full min-w-[320px] table-fixed border-separate border-spacing-0 text-left">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            <th scope="col" className="h-16 p-0 pb-3 pl-2 align-bottom text-left text-xs font-bold uppercase tracking-[0.08em] text-muted md:pb-4 md:pl-1.5"><span className={featureHeader ? undefined : 'sr-only'}>{featureHeader ?? caption}</span></th>
            {columns.map((c, i) => (
              <th key={i} scope="col" className={`w-[62px] px-1 text-center leading-tight sm:w-[22%] md:w-[19%] ${i === highlightColumn ? 'rounded-t-[18px] bg-primary align-middle font-display text-base font-extrabold text-on-primary md:text-xl' : 'pb-3 align-bottom text-xs font-bold text-muted md:pb-4 md:text-sm'}`}>
                <span className="inline-flex items-center justify-center gap-2">{c}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, ri) => (
            <tr key={r.feature}>
              <th scope="row" className="h-14 border-t border-divider py-2 pl-2 pr-2 text-left text-sm font-semibold leading-snug text-ink md:h-[62px] md:pl-1.5 md:text-base">{r.feature}</th>
              {r.cells.map((cell, i) => (
                <td key={i} className={`h-14 border-t border-divider px-1 text-center md:h-[62px] ${i === highlightColumn ? `border-primary/10 bg-primary-tint ${ri === last ? 'rounded-b-[18px]' : ''}` : ''}`}>
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

/** Marca de célula: `brand` (círculo da cor da marca), `yes` (círculo escuro), `no` (círculo vazado com traço). `label` é o texto para leitor de tela. */
export function CompareMark({ kind, label }: { kind: 'brand' | 'yes' | 'no'; label: string }) {
  if (kind === 'no') return <span className="flex size-7 items-center justify-center rounded-full border border-border-strong text-muted md:size-[30px]"><Icon name="minus" size={14} /><span className="sr-only">{label}</span></span>;
  return (
    <span className={`flex size-7 items-center justify-center rounded-full text-on-dark md:size-[30px] ${kind === 'brand' ? 'bg-primary text-on-primary' : 'bg-panel-dark'}`}>
      <Icon name="check" size={16} /><span className="sr-only">{label}</span>
    </span>
  );
}
