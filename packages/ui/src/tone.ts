/** Tons compartilhados por Tag e Pill: brand + estados do mapa. */
export type Tone = 'brand' | 'review' | 'watch' | 'steady' | 'unknown' | 'ai' | 'danger';

export const toneClasses: Record<Tone, string> = {
  brand: 'bg-primary-tint text-primary-deep',
  review: 'bg-review-bg text-review-text',
  watch: 'bg-watch-bg text-watch-text',
  steady: 'bg-steady-bg text-steady-text',
  unknown: 'bg-unknown-bg text-unknown-text',
  ai: 'bg-ai-bg text-ai-text', // origem IA (azul, DESIGN.md › blue)
  danger: 'bg-danger-bg text-danger-text', // resultado abaixo da meta, favorito
};
