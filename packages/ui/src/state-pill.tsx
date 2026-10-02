import { stateDotClass, type MapState } from './state';

/**
 * StateDot: bolinha de 8 px na cor do estado. `label` opcional: com ele vira role=img nomeado; sem ele é decorativo.
 * StatePill: dot + `label` (texto vem por prop, ex.: "Mais estável"), fundo/texto nos tokens do estado.
 */
export type StateDotProps = { state: MapState; label?: string };

export function StateDot({ state, label }: StateDotProps) {
  const a11y = label ? { role: 'img' as const, 'aria-label': label } : { 'aria-hidden': true as const };
  return <span {...a11y} className={`inline-block size-2 shrink-0 rounded-full ${stateDotClass[state]}`} />;
}

export type StatePillProps = { state: MapState; label: string };

const pillTone: Record<MapState, string> = {
  review: 'bg-review-bg text-review-text',
  watch: 'bg-watch-bg text-watch-text',
  steady: 'bg-steady-bg text-steady-text',
  unknown: 'bg-unknown-bg text-unknown-text',
};

export function StatePill({ state, label }: StatePillProps) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-xs font-semibold ${pillTone[state]}`}>
      <StateDot state={state} />
      {label}
    </span>
  );
}
