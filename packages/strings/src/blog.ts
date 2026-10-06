// F25: Blog Remoa
export const blog = {
  // Páginas públicas: índice, posts, categorias
  pages: {
    // /blog — lista de posts
    index: {
      title: 'Estude melhor para a residência.',
      searchPlaceholder: 'Buscar por título ou palavra-chave',
      allCategories: 'Todos',
      noPosts: {
        title: 'Nenhum post publicado ainda',
        body: 'Volte em breve para ler dicas de estudo e técnicas de memorização.',
      },
      noResults: {
        title: 'Nenhum resultado',
        body: 'Tente outro termo de busca ou navegue pelas categorias.',
      },
      pagination: 'Página {n}',
      resultsCount: '{n, plural, one {# resultado} other {# resultados}}',
      postsPerPage: '12 artigos por página',
      readingTime: '{n, plural, one {# min de leitura} other {# min de leitura}}',
      continueReading: 'Continue lendo',
      eyebrow: 'Blog',
      lead: 'Guias, técnicas e rotinas para organizar o estudo, montar mapas e revisar na hora certa.',
      searchLabel: 'Buscar no blog',
      searchSubmit: 'Buscar',
      categoriesLabel: 'Categorias',
      paginationLabel: 'Paginação do blog',
      prev: 'Anterior',
      next: 'Próxima',
      latest: 'Todos os artigos',
      readPost: 'Ler o artigo',
      seoTitle: 'Blog | Remoa',
      seoDescription: 'Guias, técnicas e rotinas para organizar o estudo para a residência médica, montar mapas e revisar na hora certa.',
      pageSeoTitle: 'Blog, página {n} | Remoa',
    },
    cta: {
      title: 'Transforme o que você leu em um mapa.',
      text: 'Crie seu primeiro mapa de graça e revise na hora certa.',
      label: 'Criar meu primeiro mapa',
    },

    // /blog/[slug] — post individual
    post: {
      notFound: {
        title: '404 — Artigo não encontrado',
        body: 'O artigo que você procura foi movido ou não existe mais.',
        suggestion: 'Voltar aos artigos',
      },
      breadcrumb: {
        home: 'Home',
        blog: 'Blog',
      },
      inThisArticle: 'Neste artigo',
      inThisGuide: 'Neste guia',
      tocLabel: 'Índice do artigo',
      breadcrumbLabel: 'Você está em',
      teamName: 'Equipe Remoa',
      authorBio: 'Conteúdo editorial do Remoa para quem estuda medicina e prepara a residência.',
      readingTime: '{n} min de leitura',
      suggestionsTitle: 'Que tal ler um destes?',
      quickSummary: 'Resumo rápido',
      author: 'Escrito por',
      publishedAt: 'Publicado em',
      updatedAt: 'Atualizado em',
      relatedPosts: 'Continue lendo',
      educationalWarning: 'Conteúdo educacional. Não substitui diretriz clínica nem supervisão.',
      preview: {
        label: 'Pré-visualização',
        expiring: 'Este link expira em 24 horas',
      },
    },

    // /blog/categoria/[slug]
    category: {
      seoTitle: '{name} | Blog Remoa',
      seoDescription: 'Artigos sobre {name} no blog do Remoa.',
      empty: 'Ainda não há artigos nesta categoria.',
      postsInCategory: '{n, plural, one {# artigo} other {# artigos}} nesta categoria',
    },
  },

  // Componentes reutilizáveis
  components: {
    postCard: {
      readingTime: '{n} min',
    },
    toc: {
      heading: 'Índice',
    },
    callout: {
      types: {
        tip: 'Dica',
        warning: 'Atenção',
        note: 'Nota',
      },
    },
  },

  // Landing: seção "Aprenda a estudar melhor"
  landing: {
    sectionTitle: 'Aprenda a estudar melhor',
    sectionDescription: 'Dicas práticas de técnicas de memorização, repetição espaçada e organização de estudos para medicina.',
    viewMore: 'Ver mais artigos',
    latestPosts: 'Artigos recentes',
  },

  // Menu e rodapé
  navigation: {
    blog: 'Blog',
  },

  footer: {
    termsLink: 'Termos de uso',
    privacyLink: 'Política de privacidade',
    contact: 'Contato',
  },
} as const;
