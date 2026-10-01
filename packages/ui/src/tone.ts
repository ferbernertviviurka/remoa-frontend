/** Tons compartilhados por Tag e Pill: brand + estados do mapa. */
export type Tone = 'brand' | 'review' | 'watch' | 'steady' | 'unknown';

export const toneClasses: Record<Tone, string> = {
  brand: 'bg-primary-tint text-primary-deep',
  review: 'bg-review-bg text-review-text',
  watch: 'bg-watch-bg text-watch-text',
  steady: 'bg-steady-bg text-steady-text',
  unknown: 'bg-unknown-bg text-unknown-text',
};
