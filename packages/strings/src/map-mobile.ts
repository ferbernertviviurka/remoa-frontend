// F23 — Mapa no celular. Texto das telas "22-28" (docs/design/v2/source/MapaMobile*.dc.html).
// Namespace: mapMobile. Reusa: common.save/cancel/close, vocab.board/card/edge/retrievability.
export const mapMobile = {
  // Cabeçalho em pílula (FR-2, FR-3)
  header: {
    menuLabel: 'Abrir o menu do mapa',
    searchLabel: 'Buscar card',
    searchPlaceholder: 'Buscar card',
    searchCloseLabel: 'Fechar busca',
    saved: 'Salvo há {time}',
    saving: 'Salvando…',
    offline: 'Sem conexão, salvando depois',
    error: 'Erro ao salvar',
  },

  // Desfazer e refazer (FR-11)
  undoRedo: {
    groupLabel: 'Desfazer e refazer',
    undoLabel: 'Desfazer',
    redoLabel: 'Refazer',
  },

  // Controles de zoom (FR-4)
  zoom: {
    groupLabel: 'Zoom',
    inLabel: 'Aproximar',
    outLabel: 'Afastar',
    fitLabel: 'Ajustar à tela',
    percentage: '{pct}%',
  },

  // Canvas e modo conectar (FR-4, FR-10)
  canvas: {
    panLabel: 'Arrastar o mapa',
    cardSelectLabel: '{title}, {type}, {state}{retrievability}',
    emptyTitle: 'Seu mapa está vazio',
    emptyBody: 'Crie o primeiro card para começar.',
    emptyAction: 'Criar primeiro card',
    errorTitle: 'Não conseguimos carregar o mapa',
    errorRetry: 'Tentar de novo',
    limitTitle: 'Limite de cards atingido',
    limitBody: 'Você atingiu {limit} cards no plano Free. Para adicionar mais, escolha o Pro.',
    limitAction: 'Ver o Pro',
    limitMax: 'Limite técnico atingido: {limit} cards no máximo.',
  },

  // Modo conectar (FR-10)
  connect: {
    tooltip: 'Toque no card que se liga a "{from}"',
    cancelLabel: 'Cancelar conexão',
    labelField: 'Rótulo (pergunta)',
    labelPlaceholder: 'Ex.: evolui para',
    labelSave: 'Salvar',
    labelSkip: 'Pular',
    labelGroup: 'Rótulo da conexão',
    noLabel: 'sem rótulo',
    duplicate: 'Esses dois cards já estão conectados.',
    self: 'Escolha outro card para conectar.',
  },

  // Peek do card — resumo (FR-8)
  peek: {
    ariaLabel: 'Card selecionado',
    closeLabel: 'Fechar',
    reviewAction: 'Revisar este conceito',
    editLabel: 'Editar card',
    connectLabel: 'Conectar a outro card',
    nextReview: '{pct}% · próxima em {date}',
    dueToday: '{pct}% · vence hoje',
    noReviews: 'Sem revisões ainda',
  },

  // Card no canvas (FR-5, FR-6)
  card: {
    typeLabel: {
      concept: 'Conceito',
      flow: 'Fluxograma',
      case: 'Caso clínico',
      image: 'Imagem',
      note: 'Conteúdo',
    },
    stateLabel: {
      review: 'Revisitar',
      watch: 'Acompanhar',
      steady: 'Mais estável',
      unknown: 'Sem revisões',
    },
    flowMore: '+ {n} {n, plural, one {passo} other {passos}}',
    flowMoreShort: '+ 2 passos',
    flowCount: '{n} {n, plural, one {passo} other {passos}}',
    recall: '{pct}%',
    recallSuffix: ', lembrança {pct}%',
    dueSuffix: ', vence hoje',
    imageAlt: 'Imagem de {title}',
  },

  // Conexões e rótulos (FR-7)
  edge: {
    noLabel: 'sem rótulo',
  },

  // Modo lista (FR-17)
  list: {
    toggleLabel: 'Cards em lista',
    toggleLabelOff: 'Voltar ao mapa',
    countLabel: '{n} {n, plural, one {card} other {cards}}',
    cardSelectLabel: '{title}, {type}, {state}, {retrievability}',
    emptyTitle: 'Nada aqui',
    emptyBody: 'Crie o primeiro card e ele aparecerá aqui.',
    ariaLabel: 'Cards em ordem de prioridade',
    heading: '{n} {n, plural, one {card} other {cards}} · ordem de prioridade',
    nextToday: 'vence hoje',
    nextOverdue: 'atrasado',
    nextOn: 'próxima em {date}',
    noRecall: 'sem lembrança ainda',
  },

  // Barra flutuante (FR-12)
  floatingBar: {
    review: 'Revisar',
    reviewLabel: 'Revisar este mapa, {count} para hoje',
    reviewCount: '{count, plural, one {# conceito} other {# conceitos}}',
    reviewNoDueLabel: 'Revisar este mapa',
    listLabel: 'Mostrar cards em lista',
    listLabelOff: 'Voltar ao mapa',
    createLabel: 'Criar card',
    dueBadge: 'Vencidos',
    dueBadgeLabel: '{count} {count, plural, one {conceito vence} other {conceitos vencem}} hoje',
  },

  // Bottom sheet de criação (FR-13)
  createSheet: {
    ariaLabel: 'Criar card',
    closeLabel: 'Fechar',
    title: 'Criar card',
    fromScratch: 'Do zero',
    faster: 'Mais rápido',
    options: {
      concept: 'Conceito',
      flow: 'Fluxograma',
      case: 'Caso clínico',
      image: 'Imagem',
      photo: {
        title: 'Tirar foto',
        sub: 'do atlas ou da apostila',
      },
      ai: {
        title: 'Gerar com IA',
        subFree: 'restam {n} no mês', // ai_generations é mensal (D-647)
        subPro: 'sem limite',
      },
      pdf: {
        title: 'Importar PDF',
        subFree: '{n} no mês',
        subPro: '{n} no mês',
      },
      anki: {
        title: 'Importar do Anki',
        sub: '.apkg',
      },
    },
    blockedFree: 'Limite atingido. O Pro permite {n}.',
    blockedBeta: 'Em breve',
    badgePro: 'Pro',
  },

  // Editor de card (FR-14)
  editor: {
    ariaLabel: 'Editar card',
    closeLabel: 'Cancelar',
    title: {
      newConcept: 'Novo conceito',
      newFlow: 'Novo fluxograma',
      newCase: 'Novo caso clínico',
      newImage: 'Nova imagem',
      editConcept: 'Editar conceito',
      editFlow: 'Editar fluxograma',
      editCase: 'Editar caso clínico',
      editImage: 'Editar imagem',
    },
    fields: {
      title: 'Título',
      titleRequired: 'Título obrigatório',
      titleHelp: 'Mínimo 2 caracteres',
      answer: 'Resposta',
      answerPlaceholder: 'Escreva a resposta ou o conceito',
      source: 'Fonte',
      sourcePlaceholder: 'Surviving Sepsis Campaign 2021',
      steps: 'Passos (um por linha)',
      stepsPlaceholder: 'Dosar lactato\nHemoculturas antes do ATB',
      presentation: 'Apresentação do caso',
      presentationPlaceholder: 'Mulher, 68 anos, febre e confusão…',
      caption: 'Legenda da imagem',
      captionPlaceholder: 'O que a imagem mostra',
    },
    genRubricLabel: 'Gerar rubrica com IA',
    saveLabel: 'Salvar',
    saveBtnFg: 'Salvar',
    minCharError: 'Dê um título com pelo menos 2 caracteres.',
    saved: 'Card salvo.',
    createdToday: 'Card criado. Ele entra na fila de revisão amanhã.',
    discardTitle: 'Descartar as alterações?',
    discardBody: 'O que você escreveu neste card será perdido.',
    discardKeep: 'Continuar editando',
    discardConfirm: 'Descartar',
    rubricDone: 'Rubrica gerada. Ela aparece quando você reabrir o card.',
    rubricError: 'Não deu para gerar a rubrica agora. Tente de novo.',
    photoError: 'Não deu para usar essa foto. Use uma imagem de até 10 MB.',
    photoCapture: 'Tirar foto do atlas ou da apostila',
    cardError: 'Não deu para criar o card agora.',
  },

  // Aside / Menu lateral (FR-15, FR-16)
  aside: {
    ariaLabel: 'Menu do mapa',
    closeLabel: 'Fechar o menu',
    backTo: 'Meus mapas',
    closeButton: 'Fechar',
  },

  // Conteúdo do aside
  asideContent: {
    // Cabeçalho do mapa
    mapPreview: 'Prévia do mapa',
    viewFull: 'Ver o mapa inteiro',
    ownerLine: '{area} · {access}',
    share: 'Compartilhar',
    shareBody: 'Link do mapa para outras pessoas',
    shopSoon: 'Em breve',
    supportBody: 'Abre o formulário de suporte',
    viewList: 'Cards em lista',
    contentLabel: 'Conteúdo',
    favorite: 'Favoritar',
    unfavorite: 'Remover de favoritos',
    mapName: '{name}',
    ownerName: '{owner}',
    ownerYou: 'Você',
    onlyYou: 'só você vê',

    // Progresso (FR-16)
    progressTitle: 'Progresso',
    avgRetrievability: 'lembrança estimada',
    retrievability: '{pct}%',
    segmentReview: 'para revisar',
    segmentWatch: 'em atenção',
    segmentSteady: 'firmes',
    segmentUnknown: 'novos',
    reviewMapLabel: 'Revisar este mapa · {n} hoje',
    reviewMapCount: '{n, plural, one {# conceito} other {# conceitos}}',

    // Ações (FR-16)
    actionsTitle: 'Ações',
    listMode: 'Cards em lista',
    listModeBody: 'Veja tudo em ordem de prioridade',
    heatmap: 'Mapa de calor da memória',
    heatmapBody: 'Cores por lembrança estimada',
    labels: 'Rótulos das conexões',
    labelsBody: 'Aparecem a partir de 80% de zoom',
    fitScreen: 'Ajustar à tela',
    coverage: 'Cobertura da matriz Enamed',
    coverageBody: 'Item: {item}',
    genAi: 'Gerar cards com IA',
    genAiFree: 'Restam {n} hoje',
    genAiPro: 'Sem limite no uso diário',
    shop: 'Vender na Loja',
    shopSub: 'A loja ainda não está aberta',
    support: 'Falar com o suporte',

    // Detalhes (FR-16)
    detailsTitle: 'Detalhes',
    owner: 'Dono',
    created: 'Criado em',
    lastEdited: 'Última edição',
    area: 'Área',
    stats: '{cards} cards · {edges} conexões',
    usage: '{used} de {limit} cards',
  },

  // Estados (FR-20)
  states: {
    // Carregando
    skeletonLabel: 'Carregando o mapa',

    // Erro de salvamento
    errorTitle: 'Erro ao salvar',
    errorRetry: 'Tentar de novo',

    // Offline
    offlineTitle: 'Sem conexão',
    offlineBody: 'Você continua trabalhando. Salvaremos quando a rede voltar.',

    // Limite atingido
    limitReachedTitle: 'Limite atingido',
    limitReachedFree: 'Você atingiu {limit} cards. Escolha o Pro para adicionar mais.',
    limitReachedMax: 'Limite técnico: máximo {limit} cards.',
  },

  // Acessibilidade (FR-22)
  a11y: {
    // Landmarks e regions
    canvasLabel: 'Mapa visual',
    contentLabel: 'Conteúdo do mapa',
    floatingBarLabel: 'Controles do mapa',
    asideLabel: 'Menu lateral do mapa',

    // Switches e toggles
    heatmapSwitch: 'Mapa de calor da memória ligado',
    heatmapSwitchOff: 'Mapa de calor da memória desligado',
    labelsSwitch: 'Rótulos das conexões ligados',
    labelsSwitchOff: 'Rótulos das conexões desligados',
    listSwitch: 'Modo lista ligado',
    listSwitchOff: 'Modo mapa ligado',

    // Notificações de estado
    toastDismiss: 'Fechar aviso',
    cardCreated: 'Card criado. Ele entra na fila de revisão amanhã.',
    connectionCreated: 'Conexão criada. Dê um rótulo para ela virar pergunta.',
    cardMoved: 'Card movido.',
    cardDeleted: 'Card deletado.',
    undone: 'Desfeito.',
    redone: 'Refeito.',
  },
} as const;
