import { mapStateOrder, type MapState } from '../state';
import { stateDotClass } from '../state';

/**
 * Legend: legenda flutuante dos 4 estados do mapa (dot 9 px + rótulo 12,5 px). Aparece na camada Lembrança, fora do desafio
 * (quem monta decide). `labels` por prop; `aria-label` do grupo opcional. Diferente de LegendBar (rodapé v1).
 */
export type LegendProps = { labels: Record<MapState, string>; 'aria-label'?: string };

export function Legend({ labels, 'aria-label': ariaLabel }: LegendProps) {
  return (
    <ul aria-label={ariaLabel} className="m-0 flex h-[38px] list-none items-center gap-4 rounded-[14px] border border-border bg-surface px-4 text-[12.5px] font-semibold text-(--cv-ink-2)">
      {mapStateOrder.map((s) => (
        <li key={s} className="flex items-center gap-1.5">
          <span className={`block size-[9px] rounded-full ${stateDotClass[s]}`} />
          {labels[s]}
        </li>
      ))}
    </ul>
  );
}
