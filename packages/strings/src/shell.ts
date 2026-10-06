/** Chaves de namespaces pesados que o shell do app (navbar, rail, planos, conta, cadastro) precisa; ficam no núcleo para não puxar o namespace inteiro (G21, D-1019). O texto vive aqui e o namespace completo faz spread. */
export const referralShell = {
  navCta: 'Indique e ganhe',
  plansPromo: 'Prefere ganhar o Pro?',
  accountEntry: 'Indique e ganhe',
  plansPromoDesc: 'Convide um amigo: quando ele criar o primeiro mapa, vocês dois ganham 1 mês de Pro.',
  plansPromoCta: 'Indique e ganhe',
  panelLink: 'Ganhe Pro indicando um amigo',
  accountEntryDesc: 'Convide amigos para o Remoa e ganhe 1 mês de Pro a cada amigo que criar o primeiro mapa.',
  accountEntryCta: 'Convidar amigos',
  reward_moment: {
    notification: '{name} criou o primeiro mapa. Vocês dois ganharam 1 mês de Pro.',
    close: 'Fechar aviso',
  },
  page: { fallbackName: 'Seu amigo', removedName: 'Conta removida' },
  consent: { nameVisibility: 'Seu nome aparece para quem convidou você.' },
} as const;

export const storeShell = { soonTag: 'Breve' } as const;

export const adminShell = { navigation: { admin: 'Admin' } } as const;

export const legalShell = {
  signup: {
    acceptance: 'Ao criar a conta você aceita os Termos de Uso e a Política de Privacidade',
    termsLink: 'Termos de Uso',
    privacyLink: 'Política de Privacidade',
  },
  account: {
    legalDocuments: 'Documentos legais',
  }
} as const;
