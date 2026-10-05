/** Estados de uma indicação no mapa (FR-10): `qualified` = primeiro mapa criado (marca), `signed_up` = cadastrou (âmbar), `invited` = convite enviado (tracejado cinza). */
export type ReferralStatus = 'qualified' | 'signed_up' | 'invited';

/** Classes por estado (tokens; sem hex). `node` = nó do mapa, `chip` = etiqueta, `avatar` = iniciais da lista, `step` = marcador da linha do tempo, `edge` = cor do traço do mapa. */
export const statusStyle: Record<ReferralStatus, { node: string; chip: string; avatar: string; step: string; edge: string; edgeWidth: number; dashed: boolean; rank: number }> = {
  qualified: { node: 'border-primary border-solid bg-primary-tint text-primary-deep', chip: 'bg-primary-tint text-primary-deep', avatar: 'bg-primary-tint text-primary-deep', step: 'bg-primary', edge: 'var(--primary)', edgeWidth: 3, dashed: false, rank: 2 },
  signed_up: { node: 'border-watch border-solid bg-surface text-watch-text', chip: 'bg-watch-bg text-watch-text', avatar: 'bg-chip text-muted', step: 'bg-watch', edge: 'var(--state-watch-border)', edgeWidth: 2.5, dashed: false, rank: 1 },
  invited: { node: 'border-unknown border-dashed bg-canvas text-muted', chip: 'bg-unknown-bg text-muted', avatar: 'bg-chip text-muted', step: 'bg-unknown', edge: 'var(--state-unknown-soft)', edgeWidth: 2, dashed: true, rank: 0 },
};
