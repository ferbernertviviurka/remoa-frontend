export const support = {
  // FR-1: Botão flutuante
  floatingButton: {
    label: 'Suporte',
    ariaLabel: 'Abrir suporte',
    unreadCount: '{count} resposta',
    unreadCountMany: '{count} respostas',
  },

  // FR-1: Atalhos
  navigation: {
    talkToSupport: 'Falar com o suporte',
    help: 'Ajuda',
  },

  // FR-2: Modal
  modal: {
    title: 'Fale com o suporte',
    description: 'Conte o que aconteceu. A resposta chega por e-mail e também aqui.',
    tabsLabel: 'Seções do suporte',
    discard: 'Descartar',
    keepEditing: 'Continuar editando',
    back: 'Voltar para a lista',
    tabNewTicket: 'Novo chamado',
    tabMyTickets: 'Meus chamados',
    tabMyTicketsCount: 'Meus chamados ({unread})',
    close: 'Fechar',
    unsavedWarning: 'Você tem um chamado não enviado. Tem certeza que quer sair?',
    unsavedTitle: 'Descartar o chamado?',
  },

  // FR-3: Formulário
  form: {
    label: 'Enviar um chamado',
    type: {
      label: 'Tipo de problema',
      legend: 'Sobre o que é?',
      required: 'Escolha o tipo do chamado.',
      options: {
        broken: 'Algo não funciona',
        billing: 'Cobrança e plano',
        medical: 'Conteúdo médico',
        suggestion: 'Sugestão',
        other: 'Outro',
      },
    },
    subject: {
      label: 'Assunto',
      placeholder: 'Resuma em uma frase',
      error: 'Escreva um assunto com pelo menos 5 caracteres.',
      required: 'Escreva um assunto com pelo menos 5 caracteres.',
    },
    description: {
      label: 'O que aconteceu?',
      placeholder: 'Conte o que você esperava e o que viu. Se puder, o passo a passo.',
      hint: 'Pelo menos 20 caracteres.',
      charCount: '{count} de 2000',
      error: 'Conte um pouco mais: pelo menos 20 caracteres.',
      required: 'Conte um pouco mais: pelo menos 20 caracteres.',
    },
    attachments: {
      label: 'Anexos',
      hint: 'PNG ou JPG, até 5 MB, no máximo 3.',
      add: 'Anexar captura de tela',
      uploadError: 'Não foi possível enviar a imagem.',
      remove: 'Remover {name}',
      error: 'Arquivo deve ser PNG ou JPG com até 5 MB',
      limitReached: 'Máximo de 3 anexos atingido',
    },
    email: {
      label: 'E-mail de resposta',
      hint: 'Usaremos este e-mail para responder seu chamado',
      replyTo: 'Resposta para',
    },
    cancel: 'Cancelar',
    submit: 'Enviar chamado',
  },

  // FR-4: Informações técnicas
  technical: {
    label: 'Enviar informações técnicas',
    title: 'Informações técnicas enviadas junto',
    note: 'Nunca enviamos o conteúdo dos seus mapas nem a sua senha.',
    offKey: 'Informações técnicas',
    offValue: 'Não serão enviadas',
    toggle: 'Incluir informações do meu dispositivo',
    hint: 'Nos ajuda a entender melhor seu problema',
    transparency: 'Nunca enviamos conteúdo de mapas, sua senha, tokens ou dados de cobrança.',
    details: {
      currentScreen: 'Tela atual',
      plan: 'Plano',
      browserAndSystem: 'Navegador',
      os: 'Sistema',
      appVersion: 'Versão do app',
      timezone: 'Fuso horário',
    },
  },

  // FR-6: Estados do envio
  submission: {
    validating: 'Validando…',
    sending: 'Enviando…',
    error: 'Não foi possível enviar.',
    tryAgain: 'Tentar de novo',
    success: 'Chamado #{number} enviado.',
    draft: 'Rascunho preservado.',
    draftExpired: 'Rascunho expirou após 24 h.',
    duplicate: 'Você já enviou um chamado igual há pouco. Veja em Meus chamados ou aguarde 10 minutos.',
    rateLimited: 'Você atingiu o limite de chamados por hora. Tente novamente mais tarde.',
    dailyLimitReached: 'Você atingiu o limite de chamados por dia (20).',
  },

  // FR-6: Sucesso
  successScreen: {
    title: 'Chamado enviado',
    subtitle: 'Recebemos sua mensagem e responderemos em breve.',
    ticketNumber: 'Seu número é #{number}',
    viewTickets: 'Ver meus chamados',
    close: 'Fechar',
  },

  // FR-7: Meus chamados
  tickets: {
    empty: 'Você não tem nenhum chamado ainda.',
    emptyDesc: 'Quando enviar um chamado, ele aparecerá aqui.',
    list: {
      ariaLabel: 'Lista de meus chamados',
      subject: 'Assunto',
      number: 'Número',
      type: 'Tipo',
      date: 'Data',
      status: 'Status',
      unread: 'Não lido',
    },
    statuses: {
      open: 'Aberto',
      inProgress: 'Em análise',
      answered: 'Respondido',
      resolved: 'Resolvido',
    },
    detail: {
      reopened: 'Reabrido por sua resposta',
      canReopenUntil: 'Pode reabrir até {date}',
      reopen: 'Reabrir',
      markResolved: 'Marcar como resolvido',
      noMessages: 'Sem mensagens ainda.',
    },
  },

  // FR-8: Conversação
  thread: {
    ariaLabel: 'Conversa do chamado #{number}',
    yourMessage: 'Sua mensagem',
    you: 'Você',
    team: 'Equipe Remoa',
    replyLabel: 'Responder',
    closedError: 'Este chamado foi encerrado há mais de 14 dias. Abra um novo chamado.',
    adminReply: 'Resposta da equipe',
    systemMessage: 'Mensagem do sistema',
    timestamp: '{when}',
    replyPlaceholder: 'Digite sua resposta…',
    reply: 'Enviar resposta',
    replying: 'Enviando…',
    replyError: 'Não foi possível enviar a resposta.',
  },

  // FR-8: Notificações
  notifications: {
    ticketReceived: {
      subject: 'Chamado #{number} recebido',
      body: 'Recebemos seu chamado. Responderemos em breve.',
    },
    ticketAnswered: {
      subject: 'Resposta ao seu chamado #{number}',
      body: 'A equipe respondeu ao seu chamado.',
    },
    linkText: 'Ver chamado',
  },

  // FR-9: Privacidade
  privacy: {
    label: 'Privacidade',
    exportDeleteNote: 'Seus chamados serão incluídos quando você solicitar a exportação de dados ou deletar sua conta.',
    retentionNote: 'Mantemos seus chamados por 12 meses após a resolução.',
  },

  // FR-24: Erros
  errors: {
    loading: 'Carregando suporte…',
    loadError: 'Não foi possível carregar o suporte. Tente recarregar.',
    fetchTickets: 'Não foi possível carregar seus chamados.',
    fetchTicket: 'Não foi possível carregar este chamado.',
    networkError: 'Verifique sua conexão.',
  },

  // FR-23: Acessibilidade
  a11y: {
    dialogRole: 'Suporte',
    loading: 'Carregando…',
    messageNew: 'Nova mensagem: {preview}',
  },
} as const;
