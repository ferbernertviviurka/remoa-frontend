// P-507 (D-1069): one module per namespace, so a page only ships the namespaces it uses (webpack keeps or drops whole modules).
/** Página do link público /m/[token] (FR-13, FR-14, FR-15). */
export const sharedMap = {
  // Faixa de advertência (FR-13, Regra 6)
  disclaimer: 'Mapa criado por um aluno. Não passou por revisão médica do Remoa.',

  // Mapa protegido por senha (FR-14)
  lockedTitle: 'Mapa protegido por senha',
  passwordLabel: 'Senha',
  unlockCta: 'Entrar',
  unlocking: 'Verificando…',
  wrongPassword: 'Senha incorreta',
  tooManyAttempts: 'Muitas tentativas. Tente de novo em 15 minutos.',

  // Ações
  copyCta: 'Copiar para os meus mapas',
  copying: 'Copiando…',
  createCta: 'Criar meu mapa no Remoa',

  // Contagem de cards (aria e UI)
  cardCount: '{n, plural, one {# card} other {# cards}}',

  // 404
  notFoundTitle: 'Este link não está mais ativo',
  notFoundBack: 'Voltar para Meus mapas',

  // Metadados (og/title)
  metaTitle: 'Mapa de estudo — Remoa',
  metaDescription: 'Veja este mapa de estudo e copie para os seus mapas no Remoa.',
} as const;
