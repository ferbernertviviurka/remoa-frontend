// F17 — Importador Anki v2: strings de newMap.about.*, import.summary/adjust/existing,
// share.*, sharedMap.*, boards.access.*, boards.area.*, boards.origin.*.
// Não duplicar: reaproveitar common.save/cancel/close/retry e import.* já existentes.
// ICU minimal: {n, plural, =0 {…} one {…} other {…}}; # = n formatado em pt-BR.

export const f17 = {
  /** Formulário "Sobre o mapa" (passo 3 do Anki / passo 2 do Em branco / PDF). FR-2, FR-5, FR-7. */
  newMapAbout: {
    // Títulos do passo
    title: 'Sobre o mapa',
    desc: 'Dê um nome, escolha a área e quem pode acessar. Você muda o nome e o acesso depois.',

    // Campos do formulário
    nameLabel: 'Nome do mapa',
    areaLabel: 'Grande área',
    itemsLabel: 'Itens da matriz',
    accessLabel: 'Acesso',

    // Busca de itens da matriz
    searchPlaceholder: 'Buscar por tema ou código',
    suggestionsLabel: 'Sugeridos',
    emptySearch: 'Nenhum item encontrado para essa busca.',

    // Limite de itens
    itemsMax: 'Você pode ligar até {max} {max, plural, one {item} other {itens}} da matriz.',

    // Aviso de troca de área
    areaChangedWarning: 'Os itens foram limpos porque a área mudou.',

    // Área sem matriz
    noMatrixMessage: 'A matriz Enamed desta área ainda não está disponível.',

    // Remoção de chip (aria)
    removeItem: 'Remover {label}',

    // Erros de validação
    nameRequired: 'Dê um nome ao mapa.',
    nameTooLong: 'O nome pode ter até 120 caracteres.',

    // Senha do mapa privado
    passwordLabel: 'Senha do mapa',
    passwordHint: 'De 6 a 64 caracteres.',
    passwordRequired: 'A senha é obrigatória para mapas privados.',
    passwordShowAriaLabel: 'Mostrar senha',
    passwordHideAriaLabel: 'Ocultar senha',
  },

  /** Níveis de acesso do mapa. FR-7, FR-12. */
  boardsAccess: {
    owner: 'Só eu',
    ownerDesc: 'Só você acessa. Sem link.',
    password: 'Privado',
    passwordDesc: 'Quem tiver o link e a senha pode ver e copiar.',
    public: 'Público',
    publicDesc: 'Quem tiver o link pode ver e copiar.',
  },

  // boards.area.{CM,CIR,GO,PED,MP} já existem em pt-BR.ts:763-769 — não duplicar.
  // T5-T7: usar t('boards.area.CM') etc.

  /** Passos do fluxo Anki v2 (FR-1). */
  ankiSteps: {
    step1: 'Como começar',
    step2: 'Envie o seu arquivo',
    step3: 'Sobre o mapa',

    // Passo 2: upload com progresso
    uploading: 'Enviando… {pct}%',
    uploadingLabel: 'Progresso do envio',
    inspecting: 'Inspecionando o arquivo… {pct}%',
    inspectingLabel: 'Progresso da inspeção',

    // CTA do passo 3
    importCta: '{n, plural, one {Importar # card} other {Importar # cards}}',
  },

  /** Resumo da importação (FR-8). */
  importSummary: {
    // Cartão de resumo
    card: '{cards, plural, one {# card} other {# cards}} · {media, plural, =0 {sem imagens} one {# imagem} other {# imagens}} · {decks, plural, one {# baralho (vira coluna)} other {# baralhos (viram colunas)}}',
    examplesTitle: 'Exemplos de cards',

    // Alertas (só exibidos quando o valor > 0 ou condição ativa)
    alertPlanLimit: 'Este arquivo tem {total} cards. O seu plano importa até {max} por vez. Assine o Pro para importar arquivos maiores.',
    alertPlanLimitTitle: 'Acima do limite do plano',
    alertUnknownNoteTypes: '{n, plural, one {# tipo de nota desconhecido foi tratado como conceito.} other {# tipos de nota desconhecidos foram tratados como conceito.}}',
    alertMissingMedia: '{n, plural, one {# card tem mídia faltando e pode ficar sem imagem.} other {# cards têm mídia faltando e podem ficar sem imagem.}}',
    alertLargeMedia: '{n, plural, one {# imagem passa de 10 MB e não será importada.} other {# imagens passam de 10 MB e não serão importadas.}}',
  },

  /** Acordeão "Ajustar importação" (FR-9). */
  importAdjust: {
    title: 'Ajustar importação',
    desc: 'Escolha quais baralhos entrar e como os campos do Anki viram card.',
  },

  /** Mapa existente com mesmo nome (FR-11). */
  importExisting: {
    title: 'Já existe um mapa com esse nome',
    importIntoExisting: 'Importar no mapa existente (cards repetidos são ignorados)',
    createNew: 'Criar um mapa novo',
    accessWarning: 'O acesso do mapa existente não muda.',
  },

  /** Relatório pós-importação. */
  importReport: {
    open: 'Abrir mapa',
  },

  /** Diálogo "Compartilhar" no editor (FR-12). */
  /** FR-21: "Propriedades do mapa". */
  mapProps: {
    menu: 'Propriedades do mapa',
    title: 'Propriedades do mapa',
    desc: 'Nome, grande área, itens da matriz e acesso.',
    save: 'Salvar',
    saved: 'Propriedades salvas',
    areaWarning: 'Ao mudar a área, os itens da matriz de outras áreas serão removidos deste mapa.',
    error: 'Não foi possível salvar tudo. Tente de novo.',
  },

  share: {
    title: 'Compartilhar',
    headerButton: 'Compartilhar',

    // CopyField
    copyLabel: 'Copiar',
    copiedLabel: 'Copiado',
    linkFieldLabel: 'Link de compartilhamento',
    copyToast: 'Link copiado',

    // Ações de link
    rotateLink: 'Gerar novo link',
    rotateLinkConfirm: 'O link atual vai parar de funcionar.',
    rotateLinkConfirmCta: 'Gerar novo link',
    rotateLinkCancel: 'Cancelar',

    // Troca de senha
    changePassword: 'Trocar senha',
    passwordCurrentHidden: 'A senha atual não é mostrada.',
    newPasswordLabel: 'Nova senha',
    savePassword: 'Salvar senha',

    // Responsabilidade
    responsibility: 'Você responde pelo conteúdo e pelas imagens que compartilha.',

    // Salvar acesso
    save: 'Salvar',

    // Erros
    saveError: 'Não conseguimos salvar. Tente de novo.',
    rotateError: 'Não conseguimos gerar um novo link. Tente de novo.',
    changePasswordError: 'Não conseguimos salvar a senha. Tente de novo.',

    // Contador de cópias (FR-20)
    copies: '{n, plural, =0 {Nenhuma cópia ainda} one {Copiado # vez} other {Copiado # vezes}}',
  },

  /** Página do link público /m/[token] (FR-13, FR-14, FR-15). */
  sharedMap: {
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
  },

  /** Origem da cópia no painel de informações do mapa (FR-16). */
  boardsOrigin: {
    copiedFrom: 'Copiado de um mapa compartilhado em {date}. Conteúdo de aluno, sem revisão médica.',
  },
} as const;
