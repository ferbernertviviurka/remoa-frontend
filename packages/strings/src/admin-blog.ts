// F25: Admin do Blog
export const adminBlog = {
  // Menu de navegação
  navigation: {
    blog: 'Blog',
  },

  // FR-1: Título e navegação
  header: {
    title: 'Blog',
    subtitle: '{count, plural, one {# post} other {# posts}} no total',
  },

  // FR-2: Lista de posts
  list: {
    searchPlaceholder: 'Buscar por título ou endereço',
    newPostButton: 'Novo post',

    // Filtros de status
    filters: {
      all: 'Todos',
      published: 'Publicados',
      scheduled: 'Agendados',
      draft: 'Rascunhos',
      archived: 'Arquivados',
    },

    // Resumo de status
    summary: {
      total: 'Total',
      published: 'Publicados',
      scheduled: 'Agendados',
      draft: 'Rascunhos',
      archived: 'Arquivados',
    },

    // Colunas da tabela
    columns: {
      post: 'Post',
      category: 'Categoria',
      template: 'Template',
      status: 'Status',
      date: 'Data',
      actions: 'Ações',
    },

    ariaLabel: 'Lista de posts do blog',
    filtersLabel: 'Filtrar por status',
    summaryLabel: 'Resumo por status',
    noCover: 'Post sem capa',
    loadError: 'Não foi possível carregar os posts. Tente de novo.',
    retry: 'Tentar de novo',
    pageSummary: 'Página {page} de {pages}',
    prev: 'Anterior',
    next: 'Próxima',
    duplicateError: 'Não foi possível duplicar o post.',

    // Estados da tabela
    noResults: 'Nenhum post com esses filtros.',
    noPost: 'Nenhum post publicado ainda',

    // Ações
    actions: {
      edit: 'Editar',
      view: 'Ver',
      duplicate: 'Duplicar',
      unpublish: 'Despublicar',
      delete: 'Excluir',
    },

    // Status badges
    statuses: {
      draft: 'Rascunho',
      scheduled: 'Agendado',
      published: 'Publicado',
      archived: 'Arquivado',
    },

    // Duplicar
    duplicateCopy: '(cópia)',
  },

  // FR-3: Card do Sitemap
  sitemap: {
    label: 'Sitemap',
    title: 'Sitemap: {count} URLs',
    lastUpdated: 'Atualizado {date} · próxima atualização automática amanhã às 03:00 (Brasília) · também atualiza ao publicar ou despublicar',
    viewUrls: 'Ver URLs',
    hideUrls: 'Ocultar URLs',
    urlColumns: {
      address: 'Endereço',
      type: 'Tipo',
      lastmod: 'lastmod',
    },
    neverGenerated: 'ainda não gerado',
    loadError: 'Não foi possível carregar o sitemap.',
    refreshError: 'Não foi possível atualizar o sitemap.',
    types: { home: 'Início', blog: 'Blog', category: 'Categoria', post: 'Post', legal: 'Página legal' },
    sitemapLink: 'sitemap.xml',
    regenerateButton: 'Atualizar agora',
    toast: 'Sitemap atualizado',
  },

  // FR-4: Modal Novo post
  newPost: {
    title: 'Novo post',
    titleLabel: 'Título',
    titlePlaceholder: 'Ex.: Como montar um mapa de estudo',
    titleHint: 'Mínimo 10 caracteres',
    templateLabel: 'Escolha um template',

    templates: {
      leitura: {
        name: 'Leitura',
        description: 'Artigo clássico, uma coluna. Para textos longos.',
        hint: 'Quando usar: textos explicativos e longos',
      },
      guia: {
        name: 'Guia',
        description: 'Índice lateral e resumo. Para passo a passo.',
        hint: 'Quando usar: passo a passo e guias de estudo',
      },
      destaque: {
        name: 'Destaque',
        description: 'Capa escura e títulos numerados. Para listas.',
        hint: 'Quando usar: listas e "N erros/dicas"',
      },
    },

    templateHint: 'Dá para trocar o template depois, com a prévia ao vivo.',
    createButton: 'Criar e abrir o editor',
    cancel: 'Cancelar',
    closeLabel: 'Fechar',
    createError: 'Não foi possível criar o post.',
  },

  // FR-5 a FR-8: Editor
  editor: {
    title: 'Editor',
    titleLabel: 'Título (H1)',
    descriptionLabel: 'Descrição (para Google)',
    descriptionPlaceholder: 'Descrição breve do artigo',
    descriptionHint: '{count}/160 caracteres',
    coverLabel: 'Imagem de capa',
    coverAltLabel: 'Texto alternativo (obrigatório)',
    coverAltPlaceholder: 'Descreva a imagem brevemente',

    // Autosave
    autosave: {
      saving: 'Salvando…',
      saved: 'Salvo agora',
    },

    // Blocos de conteúdo
    blocks: {
      label: 'Blocos',
      addButton: 'Adicionar bloco',
      paragraph: 'Parágrafo',
      heading2: 'H2 (subtítulo)',
      heading3: 'H3 (subseção)',
      heading4: 'H4 (opcional)',
      list: 'Lista',
      orderedList: 'Lista numerada',
      blockquote: 'Citação',
      callout: 'Destaque',
      calloutTypes: {
        tip: 'Dica',
        warning: 'Atenção',
        note: 'Nota',
      },
      image: 'Imagem',
      button: 'Botão',
      faq: 'FAQ',

      // Ações em blocos
      moveUp: 'Mover para cima',
      moveDown: 'Mover para baixo',
      delete: 'Remover bloco',
    },

    // Links
    links: {
      label: 'Link',
      textPlaceholder: 'Texto do link',
      addressPlaceholder: 'Endereço ou caminho interno',
      internalSearch: 'Buscar posts internos',
      openNewTab: 'Abrir em nova aba',
      nofollow: 'nofollow',
      sponsored: 'sponsored',
    },

    // Imagem
    image: {
      caption: 'Legenda (opcional)',
      alt: 'Texto alternativo (obrigatório)',
    },

    // Botão
    button: {
      text: 'Texto do botão',
      url: 'Endereço',
    },

    // FAQ
    faq: {
      question: 'Pergunta',
      answer: 'Resposta',
      addQuestion: 'Adicionar pergunta',
    },

    // Ações do editor
    preview: 'Pré-visualizar',
    saveDraft: 'Salvar rascunho',
    publish: 'Publicar',

    // T7: editor em blocos (D-943–D-947)
    ui: {
      subtitle: '/blog/{slug} · {template}',
      titleCount: '{count} caracteres',
      titleTooShort: 'Mínimo de 10 caracteres (até lá o título não é salvo)',
      descriptionLabel: 'Descrição (aparece no Google e nas redes)',
      descriptionCount: '{count}/160',
      loadError: 'Não foi possível carregar o post.',
      toastClose: 'Fechar aviso',
      toastViewport: 'Avisos',
      cover: {
        upload: 'Enviar imagem',
        replace: 'Trocar imagem',
        hint: 'PNG, JPG ou WebP de até 5 MB. As redes usam um recorte de 1200 × 630.',
        uploading: 'Enviando… {pct}%',
        badImage: 'Use PNG, JPG ou WebP de até 5 MB.',
        uploadError: 'Não foi possível enviar a imagem. Tente de novo.',
        size: '{width} × {height}',
        altMissing: 'Descreva a imagem de capa',
        previewAlt: 'Prévia da capa',
      },
      content: {
        label: 'Conteúdo',
        toolbar: 'Formatação e blocos',
        placeholder: 'Escreva o texto do post…',
        bold: 'Negrito',
        italic: 'Itálico',
        insertLink: 'Inserir link',
        invalid: 'Há blocos incompletos (campos destacados). O conteúdo volta a ser salvo quando estiverem preenchidos.',
      },
      blockFields: {
        imageTitle: 'Inserir imagem',
        imagePick: 'Escolher arquivo',
        imageMissing: 'Imagem enviada',
        insert: 'Inserir',
        altRequired: 'Obrigatório',
        hrefInvalid: 'Use http, https, mailto ou um caminho interno (/...).',
        calloutVariant: 'Tipo de destaque',
        faqRemove: 'Remover pergunta',
        faqItem: 'Pergunta {n}',
      },
      link: {
        title: 'Inserir link',
        text: 'Texto do link',
        address: 'Endereço',
        addressPlaceholder: 'https://… ou /blog/…',
        search: 'Buscar posts do blog',
        searchEmpty: 'Nenhum post encontrado.',
        nofollow: 'Não passar autoridade (nofollow)',
        sponsored: 'Link patrocinado (sponsored)',
        note: 'Links de fora abrem em nova aba e levam noopener noreferrer.',
        apply: 'Inserir link',
        remove: 'Remover link',
        invalid: 'Endereço inválido: use http, https, mailto ou um caminho interno.',
      },
      autosave: {
        error: 'Falha ao salvar',
        pending: 'Alterações não salvas',
      },
      primary: {
        publish: 'Publicar',
        schedule: 'Agendar',
        update: 'Atualizar',
      },
      confirm: {
        publishTitle: 'Publicar este post?',
        publishBody: 'O post entra no blog, na Landing, no RSS e no sitemap.',
        scheduleTitle: 'Agendar este post?',
        scheduleBody: 'O post será publicado em {date} (horário de Brasília).',
        blockers: 'Falta resolver:',
        back: 'Voltar',
      },
      scheduleInPast: 'Escolha uma data e hora no futuro.',
      scheduled: 'Post agendado para {date}',
      updated: 'Alterações salvas',
      slugTaken: 'Este endereço já é usado por outro post.',
      slugInvalid: 'Use só letras minúsculas, números e hífens (até 70).',
      actionError: 'Não foi possível concluir. Tente de novo.',
      reauth: 'Sua sessão de admin expirou. Entre de novo para continuar.',
      previewError: 'Não foi possível gerar a pré-visualização.',
      authorTeam: 'Equipe Remoa',
      categoryNone: 'Sem categoria',
      tabs: 'Painel do post',
      seo: {
        preview: 'Como aparece no Google',
        titleLabel: 'Título para o Google',
        titleHint: 'Vazio usa o título do post.',
        slugHint: 'Depois de publicado, mudar o endereço cria um redirecionamento 301.',
        keywordPlaceholder: 'Ex.: estudar para a residência médica',
        indexLabel: 'Permitir que o Google indexe',
        indexNote: 'Aparece no Google e no sitemap.',
        noindexNote: 'Fica fora do Google e do sitemap.',
      },
      publication: {
        scheduleHint: 'Horário de Brasília. O job de publicação roda a cada 5 minutos.',
      },
      checks: {
        chars: '{count} caracteres',
        slugBad: 'Use só letras, números e hífens, até 70 caracteres',
        coverOk: 'Pronto',
        h2: '{count} títulos H2',
        hierarchyOk: 'H3 só depois de um H2',
        hierarchyBad: 'Há um título que pula nível',
        words: '{count} palavras',
        keywordOk: 'Presente nos 4 lugares',
        keywordBad: 'Use a palavra-chave no título, na descrição, no 1º parágrafo e no endereço',
        links: '{internal} internos · {external} externos',
        images: '{count} imagens · {missing} sem texto alternativo',
      },
      revisions: {
        label: 'Revisões',
        empty: 'Nenhuma revisão ainda.',
        restore: 'Restaurar',
        restored: 'Revisão restaurada',
      },
    },
  },

  // FR-7: Painel Publicação
  publication: {
    title: 'Publicação',
    templateLabel: 'Template',
    statusLabel: 'Status',
    statusOptions: {
      draft: 'Rascunho',
      scheduled: 'Agendado',
      published: 'Publicado',
    },
    scheduleLabel: 'Data e hora (Brasília)',
    schedulePlaceholder: 'Escolha quando publicar',
    scheduleHint: 'Exige data futura',
    categoryLabel: 'Categoria',
    authorLabel: 'Autor',
    viewOnSite: 'Ver no site',
  },

  // FR-8: Painel SEO
  seo: {
    title: 'SEO',
    seoTitleLabel: 'Título para Google',
    seoTitleHint: '≤ 60 caracteres',
    sluzLabel: 'Endereço (slug)',
    slugHint: 'Único, sem acentos, ≤ 70 caracteres',
    keywordLabel: 'Palavra-chave principal',
    indexLabel: 'Indexação',
    indexYes: 'Indexar (público no Google)',
    indexNo: 'Não indexar (privado)',

    // Prévia do Google
    preview: {
      label: 'Prévia do resultado no Google',
      url: 'remoa.com.br/blog/...',
      updated: 'Atualizado em {date}',
    },

    // Checklist SEO
    checklist: {
      label: 'Checklist de SEO',
      score: '{points}/10',
      items: {
        title: 'Título entre 30 e 60 caracteres',
        description: 'Descrição entre 120 e 160 caracteres',
        slug: 'Endereço curto, minúsculo, sem acentos (≤ 70)',
        cover: 'Capa com texto alternativo',
        heading: 'Pelo menos um H2',
        hierarchy: 'Hierarquia sem pular níveis (H3 só depois de H2)',
        wordCount: 'Pelo menos 600 palavras',
        keyword: 'Palavra-chave no título, descrição, 1º parágrafo e endereço',
        links: 'Pelo menos um link interno e um externo',
        images: 'Imagens do texto com alternativa',
      },
      states: {
        ok: 'Ok',
        warning: 'Aviso',
        error: 'Erro',
      },
      messages: {
        tooShort: 'Muito curto',
        tooLong: 'Muito longo',
        perfect: 'Ideal',
        missing: 'Faltando',
      },
    },
  },

  // FR-9: Publicar
  publish: {
    title: 'Publicar',
    confirmTitle: 'Publicar artigo?',
    confirmBody: 'O artigo será visível no blog, na landing page e no sitemap.',
    confirmButton: 'Publicar',
    cancel: 'Cancelar',

    // Bloqueios de publicação
    blockedTitle: 'Não é possível publicar',
    blockedMessage: 'Falta: {missing}',
    missingItems: {
      title: 'título (≥ 10 caracteres)',
      description: 'descrição (≥ 70 caracteres)',
      slug: 'slug válido',
      cover: 'capa com texto alternativo',
      heading: 'pelo menos um H2',
    },

    // Toast de sucesso
    success: 'Artigo publicado',
    sitemapUpdated: 'Sitemap atualizado',
  },

  // FR-10: Pré-visualização
  preview: {
    label: 'Pré-visualizar',
    title: 'Pré-visualização',
    warning: 'Pré-visualização - não indexado',
    linkExpires: 'Este link expira em 24 horas',
    openInNewTab: 'Abrir em nova aba',
  },

  // FR-13: Despublicar
  unpublish: {
    title: 'Despublicar artigo',
    confirmMessage: '"{title}" sai do blog, da landing page e do sitemap. O endereço passa a responder 404.',
    reasonLabel: 'Motivo (obrigatório)',
    reasonPlaceholder: 'Por que está despublicando?',
    reasonHint: 'Mínimo 8 caracteres',
    button: 'Despublicar e registrar',
    cancel: 'Cancelar',
    success: 'Artigo despublicado',
    tooShort: 'Escreva o motivo com pelo menos 8 caracteres.',
    error: 'Não foi possível despublicar. Tente de novo.',
    reauth: 'Esta ação exige uma autenticação recente. Faça login novamente.',
    registered: 'Ação registrada na auditoria ({id})',
    done: 'Concluir',
  },

  // Categorias
  categories: {
    label: 'Categorias',
    default: [
      'Estratégia de estudo',
      'Técnicas de memorização',
      'Enamed e residência',
      'Produtividade',
    ],
    add: 'Nova categoria',
    intro: 'Texto de apresentação (150 a 300 palavras)',
    ariaLabel: 'Categorias do blog',
    columns: { name: 'Nome', slug: 'Endereço', position: 'Ordem', intro: 'Apresentação', actions: 'Ações' },
    empty: 'Nenhuma categoria ainda.',
    loadError: 'Não foi possível carregar as categorias.',
    edit: 'Editar',
    moveUp: 'Subir',
    moveDown: 'Descer',
    introPending: 'Sem apresentação revisada',
    nameLabel: 'Nome',
    slugLabel: 'Endereço (slug)',
    slugHint: 'Só letras minúsculas, números e hífens',
    introLabel: 'Texto de apresentação',
    words: '{count, plural, one {# palavra} other {# palavras}} (ideal: 150 a 300)',
    save: 'Salvar categoria',
    cancel: 'Cancelar',
    closeLabel: 'Fechar',
    newTitle: 'Nova categoria',
    editTitle: 'Editar categoria',
    saveError: 'Não foi possível salvar a categoria. O endereço pode já estar em uso.',
    saved: 'Categoria salva',
  },

  // Geral
  empty: {
    title: 'Nenhum post criado ainda',
    body: 'Comece criando seu primeiro artigo para o blog.',
    cta: 'Novo post',
  },

  // Toasts e mensagens
  messages: {
    saving: 'Salvando…',
    saved: 'Salvo',
    error: 'Erro ao salvar',
    deleted: 'Artigo excluído',
    duplicated: 'Artigo duplicado',
    deleteTitle: 'Excluir artigo',
    deleteConfirm: '"{title}" sai do blog, da landing page e do sitemap. A exclusão é lógica e dura 30 dias.',
    deleteButton: 'Excluir e registrar',
    deleteError: 'Não foi possível excluir. Tente de novo.',
  },
} as const;
