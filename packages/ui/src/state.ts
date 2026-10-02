/** Estados do mapa (contracts `mapStates`) e seus tokens. Compartilhado por StatePill/StateDot/StateBar/GraphPreview/MapCard/LegendBar. */
export type MapState = 'review' | 'watch' | 'steady' | 'unknown';
export const mapStateOrder: readonly MapState[] = ['review', 'watch', 'steady', 'unknown'];
export const stateDotClass: Record<MapState, string> = {
  review: 'bg-review',
  watch: 'bg-watch',
  steady: 'bg-steady',
  unknown: 'bg-unknown',
};
export const stateVar: Record<MapState, string> = {
  review: 'var(--state-review-border)',
  watch: 'var(--state-watch-border)',
  steady: 'var(--state-steady-border)',
  unknown: 'var(--state-unknown-border)',
};
