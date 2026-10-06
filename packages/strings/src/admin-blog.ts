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
    intro: 'Texto de apresentação (150 a 300 caracteres)',
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
  },
} as const;
