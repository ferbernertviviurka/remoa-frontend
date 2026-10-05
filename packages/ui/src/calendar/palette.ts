/**
 * Paleta de etiquetas do Calendário (F25 FR-9): 8 cores, num único arquivo.
 * D-741: hex = `dot` da CALENDAR_PALETTE do contrato (violeta = purple, cinza = gray); quem chama mapeia hex ↔ chave do contrato. Valores do mock (Calendario*.dc.html). O architect publica a tabela oficial em docs/DESIGN.md e em
 * `@remoa/contracts` (calendar); quando sair, troque só este arquivo (a chave `key` vira a chave da paleta do contrato).
 */
export const LABEL_PALETTE = [
  { key: 'azul', color: '#2563EB' },
  { key: 'rosa', color: '#BE185D' },
  { key: 'verde', color: '#15803D' },
  { key: 'violeta', color: '#6D5BD0' },
  { key: 'turquesa', color: '#0F766E' },
  { key: 'laranja', color: '#C2410C' },
  { key: 'ambar', color: '#CA8A04' },
  { key: 'cinza', color: '#8F8AAE' },
] as const;

export type LabelColorKey = (typeof LABEL_PALETTE)[number]['key'];

/** Etiquetas padrão (cores do mock). */
export const DEFAULT_LABEL_COLORS = { prova: '#C2410C', trabalho: '#CA8A04', importante: '#6D5BD0', plantao: '#0F766E', pessoal: '#8F8AAE' } as const;

/** Do hex da etiqueta saem ponto/barra, fundo suave, texto escuro e o degradê da capa. Tudo por `color-mix`, sem hex solto. */
export function labelTone(color: string) {
  return {
    dot: color,
    bg: `color-mix(in srgb, ${color} 14%, white)`,
    text: `color-mix(in srgb, ${color} 62%, #1a1533)`,
    from: `color-mix(in srgb, ${color} 55%, white)`,
    to: color,
  };
}
export type LabelTone = ReturnType<typeof labelTone>;
