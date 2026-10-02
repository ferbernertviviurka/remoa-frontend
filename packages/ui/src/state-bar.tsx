import { mapStateOrder, stateDotClass, type MapState } from './state';

/**
 * StateBar: barra segmentada de 8 px (raio 4, vão de 2 px); "sem revisões" usa --state-unknown-soft. `counts` por estado, ordem fixa Revisitar · Acompanhar · Mais estável · Sem revisões.
 * `aria-label` obrigatório (ex.: "3 para revisitar, 2 a acompanhar…"): a barra é role=img. Total 0 → um segmento cinza.
 */
export type StateBarProps = { counts: Record<MapState, number>; 'aria-label': string };

export function StateBar({ counts, 'aria-label': ariaLabel }: StateBarProps) {
  const total = mapStateOrder.reduce((a, k) => a + Math.max(0, counts[k]), 0);
  const segs = total === 0 ? [{ state: 'unknown' as const, n: 1 }] : mapStateOrder.map((state) => ({ state, n: Math.max(0, counts[state]) })).filter((s) => s.n > 0);
  return (
    <div role="img" aria-label={ariaLabel} className="flex h-2 w-full gap-0.5 overflow-hidden rounded-[4px]">
      {segs.map((s) => (
        <span key={s.state} data-state={s.state} style={{ flexGrow: s.n }} className={`h-full basis-0 ${s.state === 'unknown' ? 'bg-unknown-soft' : stateDotClass[s.state]}`} />
      ))}
    </div>
  );
}
