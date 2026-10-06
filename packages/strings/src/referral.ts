import { referralShell } from './shell';

export const referral = {
  ...referralShell,
  // FR-1: Página e pontos de entrada
  pageTitle: 'Indique e ganhe',
  pageDesc: 'Quando seu amigo criar o primeiro mapa pelo seu link, vocês dois ganham 1 mês de Pro.',

  // Pontos de entrada (navbar, Hoje, Planos, painel, Minha conta)
  homeCard: 'Indique um amigo',
  homeCardDesc: 'Vocês dois ganham 1 mês de Pro.',

  // FR-3: Herói
  hero: {
    label: 'Indique e ganhe',
    title: 'Você e seu amigo ganham {span}1 mês de Pro{/span}.',
    subtitle: 'Quando seu amigo criar o primeiro mapa pelo seu link, vocês dois ganham 1 mês de Pro.',
    ctaPrimary: 'Convidar agora',
    ctaSecondary: 'Como funciona',
  },

  // FR-4: Link (cópia somente leitura)
  link: {
    title: 'Seu link de convite',
    subtitle: 'Quem criar o primeiro mapa por este link ganha 1 mês de Pro, e você também.',
    copy: 'Copiar link',
    copied: 'Copiado',
    prefix: 'remoa.app/i/',
  },

  // FR-5: Mensagem editável
  message: {
    label: 'Mensagem',
    placeholder: 'Sua mensagem aqui…',
    restore: 'Restaurar texto',
    charCount: '{count} de 400',
    default: 'Estou estudando para a residência com o Remoa, um mapa de estudo que me testa pelas conexões entre os conceitos. Se você criar seu primeiro mapa pelo meu link, nós dois ganhamos 1 mês de Pro: {link}',
  },

  // FR-6: Compartilhamento
  share: {
    label: 'Compartilhar',
    whatsapp: 'WhatsApp',
    telegram: 'Telegram',
    email: 'E-mail',
    more: 'Mais opções',
  },

  // FR-7: Convites por e-mail
  emailInvite: {
    label: 'Ou convide por e-mail',
    placeholder: 'amigo@email.com',
    add: 'Adicionar',
    send: 'Enviar {count} convite',
    sendMany: 'Enviar {count} convites',
    maxReached: 'Você pode enviar até 5 convites por vez.',
    invalidEmail: 'Digite um e-mail válido.',
    alreadyAdded: 'Esse e-mail já está na lista.',
    limitReached: 'Você atingiu o limite de convites por hoje.',
    errors: {
      invalid: 'Digite um e-mail válido.',
      duplicate: 'Esse e-mail já está na lista.',
      tooMany: 'Você pode enviar até 5 convites por vez.',
    },
  },

  // FR-8: Cartão de recompensa
  reward: {
    label: 'Seu Pro grátis',
    monthsUnit: '{n, plural, one {mês} other {meses}}',
    proUntil: 'Pro grátis até {date}',
    creditUntil: 'Crédito para as suas próximas cobranças',
    daysLeft: 'Faltam {days} dias de Pro grátis',
    lastRewards: 'Últimas recompensas',
    emptyState: 'Nenhum mês ainda. O primeiro amigo que criar um mapa libera o primeiro mês de Pro para vocês dois.',
    emptyHistory: 'As recompensas aparecem aqui.',
    grantedOne: '+1 mês de Pro',
    grantedMany: '+{n} meses de Pro',
    notePlanFree: 'Os meses são usados em sequência. Quando acabarem, você volta ao plano Free sem perder nada.',
    notePlanFounder: 'Seu acesso é vitalício. Os meses ganhos ficam registrados aqui.',
    notePlanPro: 'Você já assina o Pro. Cada mês vira crédito na sua próxima cobrança.',
  },

  // FR-9: Como funciona
  howItWorks: {
    label: 'Como funciona',
    title: 'Três passos, um mês para cada um.',
    step1: {
      title: 'Compartilhe seu link',
      desc: 'Mande pelo WhatsApp, e-mail ou como preferir. O link é só seu.',
    },
    step2: {
      title: 'Seu amigo cria o primeiro mapa',
      desc: 'Ele cria a conta, confirma o e-mail e monta o primeiro mapa.',
    },
    step3: {
      title: 'Vocês dois ganham 1 mês de Pro',
      desc: 'Na hora em que o primeiro mapa fica pronto, o mês é liberado para os dois.',
    },
  },

  // FR-10: Mapa das indicações
  map: {
    label: 'Suas indicações',
    title: 'O mapa dos seus amigos.',
    legend: {
      qualified: 'com o 1º mapa',
      signedUp: 'cadastraram',
      invited: 'convidados',
    },
    emptyState: 'Você ainda não convidou ninguém. Mande seu link e acompanhe cada amigo aqui.',
    youLabel: 'Você',
    inviteLabel: 'Convidar',
  },

  // FR-11: Lista de amigos
  friends: {
    label: 'Amigos',
    noFriends: 'Você ainda não convidou ninguém. Mande seu link e acompanhe cada amigo aqui.',
    whenSent: 'Convite em {when}',
    whenSignedUp: 'Cadastrou em {when}',
    whenQualified: 'Criou o primeiro mapa em {when}',
    chip: {
      invited: 'Convite enviado',
      signedUp: 'Cadastrou',
      qualified: 'Primeiro mapa criado',
    },
    detail: {
      step1: 'Convite enviado',
      step2: 'Criou a conta',
      step3: 'Criou o primeiro mapa',
      pendingInvited: 'Quando criar a conta e o primeiro mapa, vocês dois ganham 1 mês de Pro.',
      pendingSignedUp: 'O mês é liberado para os dois quando essa pessoa criar o primeiro mapa.',
      qualified: 'Vocês dois ganharam 1 mês de Pro em {when}.',
    },
  },

  // FR-12: Momento da recompensa
  // FR-13: Regras (FAQ)
  rules: {
    label: 'Regras',
    title: 'O que vale a pena saber.',
    q1: 'Quem conta como indicado?',
    a1: 'Quem ainda não tem conta no Remoa, entra pelo seu link ou convite, confirma o e-mail e cria o primeiro mapa.',
    q2: 'Quando eu e meu amigo recebemos o mês de Pro?',
    a2: 'Assim que o primeiro mapa do seu amigo fica pronto. Os dois recebem 1 mês de Pro ao mesmo tempo, e você é avisado.',
    q3: 'Posso acumular meses?',
    a3: 'Sim. Cada amigo que cria o primeiro mapa soma 1 mês, e os meses são usados em sequência.',
    q4: 'E se eu já assino o Pro?',
    a4: 'O mês vira crédito na sua próxima cobrança, no valor de um mês do seu plano.',
    q5: 'Posso indicar a mim mesmo ou a quem já tem conta?',
    a5: 'Não. Contas duplicadas, ou criadas só para ganhar meses, não contam.',
    regulationLink: 'Leia o regulamento',
  },

  // FR-14: Página do convite (/i/[code])
  invite: {
    // Válido
    metaTitle: 'Convite para o Remoa',
    validLabel: '{name} convidou você para o Remoa',
    validLabelAnon: 'Você foi convidado para o Remoa',
    validTitle: 'Ganhe 1 mês de Pro ao criar seu primeiro mapa.',
    validSubtitle: 'O Remoa transforma seus resumos em um mapa vivo de medicina, com revisão espaçada e correção com fonte.',
    validNote: '{name} também ganha 1 mês de Pro quando você criar o primeiro mapa.',
    validNoteAnon: 'Quem convidou você também ganha 1 mês de Pro quando você criar o primeiro mapa.',

    // Inválido/Expirado
    invalidTitle: 'Crie seu primeiro mapa de estudo.',
    invalidSubtitle: 'Este convite não está mais disponível, mas você ainda pode criar a sua conta e começar de graça.',
    invalidNote: 'Começar a estudar',

    // Já logado
    alreadyLoggedIn: 'Você já tem conta',
    alreadyLoggedInDesc: 'Vá para o app para começar a estudar.',
    goToApp: 'Ir para o app',

    // Tracker de progresso
    step1: 'Criar a conta',
    step2: 'Criar o primeiro mapa',
    step3Valid: 'Vocês dois ganham 1 mês de Pro',
    step3Invalid: 'Começar a estudar',

    // Sucesso após cadastro
    successTitle: 'Conta criada.',
    successDesc: 'Crie o seu primeiro mapa agora. Quando ele ficar pronto, você e {name} ganham 1 mês de Pro.',
    successDescAnon: 'Crie o seu primeiro mapa agora. Quando ele ficar pronto, você e quem convidou ganham 1 mês de Pro.',
    successDescInvalid: 'Crie o seu primeiro mapa para começar a estudar.',
    successCta: 'Criar meu primeiro mapa',

    // Form
    emailLabel: 'E-mail',
    emailPlaceholder: 'voce@email.com',
    passwordLabel: 'Senha',
    passwordPlaceholder: '8 caracteres ou mais',
    showPassword: 'Mostrar ou ocultar a senha',
    googleCta: 'Continuar com Google',
    emailOrSeparator: 'ou com e-mail',
    createCta: 'Criar conta e ganhar 1 mês',
    createCtaInvalid: 'Criar conta',
    headerSignIn: 'Já tenho conta · Entrar',
    formTitle: 'Crie sua conta',
    trackerLabel: 'Seu progresso',
    trackerDone: 'concluído',
    signUpFailed: 'Não foi possível criar a conta. Tente de novo.',
    emailTaken: 'Este e-mail já tem conta. Entre para continuar.',
    termsConsentNeutral: 'Ao criar a conta, você aceita os termos de uso e a política de privacidade.',
    termsConsent: 'Ao criar a conta, você aceita os termos de uso e a política de privacidade. Seu nome aparece para quem convidou você.',
    errors: {
      invalidEmail: 'Digite um e-mail válido.',
      shortPassword: 'A senha precisa ter 8 caracteres ou mais.',
    },
  },

  // FR-15: Consentimento
  // FR-24: Estados e erros
  errors: {
    loading: 'Carregando…',
    emptyState: 'Você ainda não convidou ninguém.',
    clipboardDenied: 'Não foi possível copiar para a área de transferência.',
    clipboardDeniedAlt: 'Selecione o texto para copiar.',
    invalidCode: 'Código de convite inválido.',
    expiredCode: 'Código de convite expirado.',
    grantPending: 'Recompensa em processamento…',
    alreadyReferred: 'Você já foi indicado por essa pessoa.',
  },

  // FR-25: Regulamento
  regulation: {
    pageTitle: 'Regulamento — Programa de Indicação de Amigos',
    // Q-045 aberta: o texto é rascunho até a revisão jurídica.
    draftBadge: 'Versão preliminar',
    draftNote: 'Este texto ainda passa por revisão jurídica e pode mudar antes da publicação.',
    link: 'Leia o regulamento',
    footer: 'Regulamento do programa',
    sections: {
      intro: 'Este regulamento estabelece as condições do Programa de Indicação de Amigos da plataforma Remoa.',
      noMoney: 'Os créditos concedidos não possuem valor em dinheiro, não são resgataráveis por moeda corrente, e servem exclusivamente para estender o acesso ao plano Pro pelo período indicado.',
      notTransferable: 'Os créditos não podem ser vendidos, cedidos a outro usuário ou utilizados como moeda de troca.',
      qualification: 'Uma indicação é qualificada quando o indicado cria conta nova, confirma e-mail e cria primeiro mapa com pelo menos 3 cards.',
      noSelfReferral: 'Indicações para conta própria e contas criadas só para ganhar créditos não são contadas.',
      limits: 'Máximo 10 indicações qualificadas em 30 dias. Acima disso, revisão manual.',
      grant: 'Os dois ganham 1 mês ao mesmo tempo em transação atômica. Créditos se encadeiam e terminam sozinhos.',
      proSubscriber: 'Assinantes Pro recebem crédito na próxima cobrança, no valor de um mês do plano.',
      rightToChange: 'A Remoa se reserva o direito de alterar, encerrar o programa, bloquear indicações suspeitas e revogar créditos.',
      privacy: 'Dados são tratados conforme a Política de Privacidade. E-mails são guardados como hash para validação.',
      expiry: 'Indicações não qualificadas em 30 dias expiram.',
      noWarranty: 'Créditos são fornecidos "conforme estão", sem garantia de disponibilidade.',
      dispute: 'Em conflito com os Termos de Serviço, os Termos prevalecem.',
    },
  },

  // Página /app/indicar (F18 T5/T6): textos de composição
  page: {
    ...referralShell.page,
    friendLabel: 'Amigo',
    heroReward: '1 mês de Pro',
    badge: '+1 mês',
    legendItem: '{n} {label}',
    emailLabel: 'E-mail do amigo',
    removeEmail: 'Remover {email}',
    mailSubject: 'Convite para o Remoa: 1 mês de Pro para nós dois',
    shareTitle: 'Remoa',
    messageCopyHint: 'Se você apagar o link, ele é acrescentado no envio.',
    invitesSent: '{count} convite enviado.',
    invitesSentMany: '{count} convites enviados.',
    sendError: 'Não foi possível enviar os convites. Tente de novo.',
    retry: 'Tentar de novo',
    loadError: 'Não foi possível carregar suas indicações.',
    rewardDetail: '{name} criou o primeiro mapa · {date}',
    creditTitle: 'Crédito de {amount}',
    done: 'concluído',
  },
} as const;
