// P-507 (D-1069): one module per namespace, so a page only ships the namespaces it uses (webpack keeps or drops whole modules).
/** Resumo da importação (FR-8). */
export const importSummary = {
  // Cartão de resumo
  card: '{cards, plural, one {# card} other {# cards}} · {media, plural, =0 {sem imagens} one {# imagem} other {# imagens}} · {decks, plural, one {# baralho (vira coluna)} other {# baralhos (viram colunas)}}',
  examplesTitle: 'Exemplos de cards',

  // Alertas (só exibidos quando o valor > 0 ou condição ativa)
  alertPlanLimit: 'Este arquivo tem {total} cards. O seu plano importa até {max} por vez. Assine o Pro para importar arquivos maiores.',
  alertPlanLimitTitle: 'Acima do limite do plano',
  alertUnknownNoteTypes: '{n, plural, one {# tipo de nota desconhecido foi tratado como conceito.} other {# tipos de nota desconhecidos foram tratados como conceito.}}',
  alertMissingMedia: '{n, plural, one {# card tem mídia faltando e pode ficar sem imagem.} other {# cards têm mídia faltando e podem ficar sem imagem.}}',
  alertLargeMedia: '{n, plural, one {# imagem passa de 10 MB e não será importada.} other {# imagens passam de 10 MB e não serão importadas.}}',
} as const;
