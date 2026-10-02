/** GAP de strings: faltam em `landing.plans.*` / `landing.faq.*` (CTAs, notas, eyebrows). Mover para @remoa/strings. */
export const plansCopy = {
  eyebrow: 'Planos',
  freeDescription: 'Para começar a montar seus mapas.',
  freeCta: 'Começar grátis',
  proCtaWaitlist: 'Entrar na lista de espera',
  proCtaOpen: 'Assinar o Pro',
  noteMonthly: 'Cobrado todo mês.',
  noteAnnual: (perMonth: string) => `Equivale a ${perMonth} por mês.`,
  faqEyebrow: 'Perguntas',
  compareEyebrow: 'Comparação',
  yes: 'Sim',
} as const;
