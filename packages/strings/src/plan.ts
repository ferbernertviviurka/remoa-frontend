// F14 — Painel do plano (PlanPopover). Texto de Main.dc.html, Biblioteca.dc.html e FRD FR-5 a FR-6.
// Reaproveitar, sem duplicar: common.retry, common.loading.
export const plan = {
  popover: {
    free: {
      title: 'Você está no plano Free',
      text: 'Nada é apagado quando você chega nos limites. Estes são os seus hoje.',
    },
    pro: {
      title: 'Você está no plano Pro',
      renewsAt: 'Renova em {date}',
      text: 'Mapas, cards e correções sem teto.',
      manage: 'Gerenciar assinatura',
    },
    founder: {
      title: 'Você é Founder',
      text: 'Acesso vitalício, IA ilimitada e as novidades primeiro.',
    },
    // D-1213: Pro sem assinatura (teste grátis ou meses de indicação/suporte). Sem portal do Stripe: só assinar.
    freePro: {
      trialTitle: 'Você está no teste grátis do Pro',
      giftTitle: 'Você está no Pro grátis',
      trialText: 'Seu teste termina em {date}. {days, plural, one {Falta # dia} other {Faltam # dias}}. Depois, a conta volta para o Free sem perder nada.',
      giftText: 'Seu Pro grátis vai até {date}. {days, plural, one {Falta # dia} other {Faltam # dias}}. Depois, a conta volta para o Free sem perder nada.',
      subscribe: 'Assinar o Pro',
    },
    meters: {
      aiCorrections: 'Correções hoje',
      pdf: 'PDFs neste mês',
      boards: 'Mapas',
      cards: 'Cards',
      value: '{used} de {limit}',
      unlimited: 'Ilimitados',
      notIncluded: 'Não incluso',
    },
    benefits: {
      title: 'Com o Pro você ganha',
      unlimited: 'Mapas e cards ilimitados.',
      unlimitedDesc: 'Sem o teto de {maps} mapas e {cards} cards.',
      ai: 'Correções por IA sem limite.',
      aiDesc: 'Responda por texto ou voz e veja o que faltou, com fonte.',
      pdf: 'Mapas de PDF e mapas prontos.',
      pdfDesc: 'Até {n} PDFs por mês e conteúdo revisado por médico.',
    },
    cta: 'Fazer upgrade',
    illustration: 'Três mapas empilhados, o terceiro com cadeado',
    loading: 'Carregando seu plano…',
    error: 'Tentar de novo',
    offline: 'Sem conexão',
    legacy: 'Você tem {n} mapas; o Free permite {max}',
  },
} as const;
