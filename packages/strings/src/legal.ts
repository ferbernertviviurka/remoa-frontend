// F16 / F25 / F27: páginas legais (conteúdo em apps/web/content/legal/*.md), aceite no cadastro e link em Minha conta.
export const legal = {
  pages: {
    eyebrow: 'Legal',
    print: 'Imprimir',
    version: 'Versão {version} · Atualizado em {date}',
    tableOfContents: 'Neste documento',
    tableOfContentsLabel: 'Índice do documento',
    draftWarning: 'Rascunho para revisão jurídica. Os trechos em destaque são variáveis do .env ou itens a confirmar. Não publique sem a revisão de um advogado.',
    pendingVersion: '[versão]',
    pendingDate: '[data]',
  },

  signup: {
    acceptance: 'Ao criar a conta você aceita os Termos de Uso e a Política de Privacidade',
    termsLink: 'Termos de Uso',
    privacyLink: 'Política de Privacidade',
  },

  account: {
    legalDocuments: 'Documentos legais',
  },

  terms: {
    pageTitle: 'Termos de Uso',
    description: 'As regras de uso do Remoa: conta, planos, conteúdo, pagamento e responsabilidades.',
  },
  privacy: {
    pageTitle: 'Política de Privacidade',
    description: 'Como o Remoa coleta, usa e protege seus dados pessoais, e como exercer seus direitos pela LGPD.',
  },
} as const;
