import { legalShell } from './shell';
// F16 / F25 / F27: páginas legais (conteúdo em apps/web/content/legal/*.md), aceite no cadastro e link em Minha conta.
export const legal = {
  ...legalShell,
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

  terms: {
    pageTitle: 'Termos de Uso',
    description: 'As regras de uso do Remoa: conta, planos, conteúdo, pagamento e responsabilidades.',
  },
  privacy: {
    pageTitle: 'Política de Privacidade',
    description: 'Como o Remoa coleta, usa e protege seus dados pessoais, e como exercer seus direitos pela LGPD.',
  },
} as const;
