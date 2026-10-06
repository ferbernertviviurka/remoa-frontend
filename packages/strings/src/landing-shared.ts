// Namespaces used by the landing client bundle; split out of pt-BR.ts so `@remoa/strings/landing` ships only these (P-174).
export const mapState = {
  review: 'Revisitar',
  watch: 'Acompanhar',
  steady: 'Mais estável',
  unknown: 'Sem revisões',
} as const;

export const challengeMode = {
  hidden_card: 'Card oculto',
  edge: 'Conexão',
  next_step: 'Próximo passo',
  occlusion: 'Imagem',
  case: 'Caso',
} as const;

export const editor = {
  headerTitle: '{area} · {title}',
  savedLabel: 'Salvo há {time}',
  savedNow: 'Salvo agora',
  layers: 'Camadas',
  explore: 'Explorar',
  challenge: 'Desafio',
  commandPalette: 'Buscar ou comandar',
  progress: '{n} de {total}',
  addCardConcept: 'Adicionar Pergunta e Resposta',
  addCardNote: 'Adicionar Conteúdo',
  addCardFlow: 'Adicionar fluxograma',
  addCardImage: 'Adicionar imagem',
  addCardCase: 'Adicionar caso clínico',
  // G06
  resetSize: 'Restaurar tamanho padrão',
  searchLabel: 'Buscar card, comando ou mapa',
  closeAlert: 'Fechar aviso',
  closePanelLabel: 'Fechar painel do card',
  recordVoiceLabel: 'Gravar resposta por voz',
  panelLabel: 'Painel do mapa',
  backToLibrary: 'Voltar para Meus mapas',
  sections: 'Seções do card',
  // T5 (editor v2)
  saving: 'Salvando…',
  suggestLink: 'Ligar a {item}',
  linkError: 'Não foi possível ligar o mapa ao item.',
  coversHeader: 'cobre {pct}% de {item}',
  coversShort: 'cobre {pct}%',
  coversMenu: 'Cobertura: {pct}% de {item}',
  cardMenu: 'Mais ações de {title}',
  // G02
  moreActions: 'Mais ações do mapa',
} as const;

export const quiz = {
  exit: 'Sair do desafio',
  challengeBoard: 'Desafiar {n, plural, one {o # que vence} other {os # que vencem}} hoje',
  transcription: 'Só a transcrição fica salva. O áudio é descartado.',
  dispute: 'Discordo da correção',
  hiddenTitle: 'Conceito oculto',
  hiddenStep: 'Passo oculto: responda no painel',
  hiddenEdge: 'Qual conexão?',
  hiddenEdgeLabel: 'Rótulo da conexão oculto: responda no painel',
  ratingLabel: 'Como foi lembrar?',
  ratingLabelSuggested: 'Como foi lembrar? Sugestão: {grade}',
  verdictLabel: { correct: 'Correto', partial: 'Parcial', incorrect: 'Incorreto' },
  subject: { step: 'Passo', stage: 'Etapa', region: 'Região', card: 'Card' },
  chipState: '{subject} em {state}',
  summaryPanel: 'Resumo da sessão',
  speak: 'Falar',
  voiceRecord: 'Falar a resposta',
  voiceNote: 'O texto aparece no campo. Confira antes de corrigir. O áudio não é enviado.',
  voiceSoon: 'Em breve',
  voiceSoonNote: 'Responder falando ainda não está disponível. Por enquanto, escreva a resposta.',
  install: 'Instalar o Remoa',
  installBody: 'A revisão fica na tela inicial, para abrir entre um plantão e outro.',
  installAction: 'Instalar',
  installDismiss: 'Agora não',
} as const;

export { boundary } from './boundary';
export { challenge } from './ns-parts/challenge';
export { canvas } from './ns-parts/canvas';
