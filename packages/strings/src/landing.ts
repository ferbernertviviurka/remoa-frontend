// F16 — Landing page copy from PRD (docs/PRD-landing.md) and FRD (docs/features/F16-landing-page.md).
// No price/percentage/count literals: use placeholders ({price}, {pct}, {n}, {value}).
// Reuse where possible: common.retry, common.cancel, plan.pro.*, plans.period.{monthly,annual}, billing.*
import { landingExtras } from './landing-g21';

export const landing = {
  ...landingExtras,
  // Navigation and layout
  nav: {
    navLabel: 'Navegação da página',
    wordmark: { aria: 'Remoa, ir para a página inicial', ariaApp: 'Remoa, ir para Hoje' },
    anchors: {
      howWorks: 'Como funciona',
      features: 'Recursos',
      ia: 'IA',
      enamed: 'ENAMED',
      calendar: 'Calendário',
      plans: 'Planos',
      faq: 'Perguntas',
    },
    signIn: 'Entrar',
    createMap: 'Criar meu primeiro mapa',
    openApp: 'Continuar estudando',
    account: 'Minha conta',
    menu: {
      aria: 'Menu de navegação',
      open: 'Abrir menu',
      close: 'Fechar menu',
    },
    // Mega menu: every feature in one panel, each item jumps to its section.
    mega: {
      label: 'Funcionalidades',
      map: { title: 'Mapa de conceitos', text: 'Cards conectados num canvas' },
      cards: { title: 'Quatro tipos de card', text: 'Conceito, caso, fluxograma e imagem' },
      challenge: { title: 'Desafio no mapa', text: 'O próprio mapa vira a prova' },
      grading: { title: 'Correção com fonte', text: 'Resposta com suas palavras' },
      fsrs: { title: 'Revisão espaçada', text: 'Revise na hora certa' },
      enamed: { title: 'Matriz do ENAMED', text: 'Veja o que já cobriu' },
      pdf: { title: 'PDF vira cards', text: 'A IA cria cards da sua aula' },
      questions: { title: 'Perguntas por IA', text: 'Objetivas e discursivas' },
      summary: { title: 'Resumo do mapa', text: 'Cada ponto cita o card' },
      bank: { title: 'Banco de questões', text: 'Provas por assunto, no seu ritmo' },
      ready: { title: 'Mapas prontos', text: 'Os 10 temas que mais caem' },
      calendar: { title: 'Calendário', text: 'Provas e prazos com aviso' },
    },
    skipLink: 'Pular para o conteúdo',
  },

  // Hero section
  hero: {
    tag: 'Para a residência médica e o Enamed',
    h1: {
      a: 'Seu conhecimento tem conexões. Seu estudo também.',
      b: 'O card te testa um por um. A prova te testa pela conexão.',
      c: 'Monte o mapa. Ele te desafia.',
    },
    subtitle: 'O Remoa transforma seus resumos em um mapa vivo de medicina: revisão espaçada em cada conceito, perguntas sobre o que liga um ao outro e correção com fonte quando você erra. Com a matriz do Enamed mostrando onde você está.',
    cta: {
      primary: 'Criar meu primeiro mapa',
      secondary: 'Experimentar um desafio',
    },
    microcopy: 'Grátis para começar. Comece com seu Anki, um PDF ou um mapa pronto.',
    chips: {
      reviewed: 'Revisado por médico',
      retrievability: 'Lembrança estimada {pct}%',
    },
    replay: 'Reproduzir de novo',
    stageAria: 'Demonstração do Remoa com um mapa de conceitos e uma pergunta de teste',
    map: {
      cards: [
        { title: 'Sepse e choque séptico', text: 'Disfunção orgânica ameaçadora à vida por resposta desregulada à infecção.' },
        { title: 'Choque séptico', text: 'Vasopressor para PAM ≥ 65 mmHg e lactato > 2 mmol/L apesar de volume adequado.' },
        { title: 'Triagem', text: 'SIRS, NEWS2 ou qSOFA: nenhum isolado afasta sepse.' },
        { title: 'Hemoculturas antes do ATB', text: '' },
        { title: 'ATB de amplo espectro', text: '' },
        { title: 'Cristaloide 30 mL/kg se hipotensão ou lactato ≥ 4 mmol/L', text: '' },
      ],
      edges: [
        'desencadeia',
        'requer triagem',
        'nenhuma triagem afasta',
        'colher antes',
        'iniciar dentro de 1 hora',
        'volume na primeira hora',
      ],
      question: 'Depois de 30 mL/kg de cristaloide, a PAM segue em 58 mmHg. O que fazer agora?',
      answer: 'Iniciar noradrenalina',
      verdict: 'Parcial',
      verdictText: 'Acertou a droga, faltou o alvo de PAM ≥ 65 mmHg.',
      rubricLine: 'Rubrica com fonte · Surviving Sepsis Campaign 2021',
      rubricLineApproved: 'Rubrica revisada por médico · Surviving Sepsis Campaign 2021',
      provenanceDraft: 'Rascunho, aguardando revisão',
    },
  },

  // Ready maps section
  ready: {
    title: 'Mapas prontos de Clínica Médica, em breve',
    titleApproved: 'Mapas prontos de Clínica Médica',
    maps: [
      'Sepse e choque séptico',
      'Insuficiência cardíaca',
      'Pneumonia',
      'Cetoacidose diabética',
      'Hipertensão arterial',
    ],
    pauseAria: 'Pausar a rolagem de mapas prontos',
    playAria: 'Retomar a rolagem de mapas prontos',
  },

  // Problem section
  problem: {
    eyebrow: 'O problema',
    title: 'Decorar card solto é esquecer em rede.',
    cards: [
      {
        title: 'Cards soltos',
        text: 'Você lembra a definição e esquece o que ela muda na conduta.',
        chip: 'sem conexões',
      },
      {
        title: 'Revisão sem contexto',
        text: 'Repetição espaçada funciona. Sem o mapa, ela só repete.',
        chip: 'repete, sem contexto',
      },
      {
        title: 'Sem saber onde está',
        text: 'Edital grande, tempo curto, nenhuma visão de cobertura.',
        chip: 'cobertura desconhecida',
      },
    ],
  },

  // How it works section
  how: {
    title: 'Conecte, revise, evolua: revisão espaçada com contexto.',
    steps: [
      {
        num: '01',
        title: 'Conectar',
        subtitle: 'Seu mapa, do seu jeito',
        text: 'Cards de conceito, fluxogramas de conduta, imagens com oclusão e casos clínicos, ligados por conexões com nome.',
      },
      {
        num: '02',
        title: 'Revisar',
        subtitle: 'Seu mapa pergunta',
        text: 'Um desafio por vez: card oculto, conexão, próximo passo, imagem, caso. A fila escolhe o que cai hoje.',
      },
      {
        num: '03',
        title: 'Evoluir',
        subtitle: 'Veja o que pede atenção',
        text: 'Lembrança estimada em cada card, mapa de calor no todo, cobertura da matriz do Enamed.',
      },
    ],
  },

  // Feature explorer section — exact copy from mock #recursos, plus the question bank
  explorer: {
    title: 'Tudo o que o seu estudo para a residência precisa, no mesmo mapa.',
    lead: 'Escolha um recurso e veja como ele aparece dentro da plataforma.',
    caption: 'Imagem da plataforma: {tab}',
    items: [
      {
        title: 'Mapa de conceitos',
        description: 'Monte o que você entende, não só o que decorou. Cada conexão tem nome, e o nome vira pergunta no desafio.',
        benefits: [
          'Arraste, ligue e dê nome às conexões',
          'Camadas: Estrutura, Lembrança e Cobertura',
          'Salva sozinho e organiza o layout para você',
        ],
      },
      {
        title: 'Quatro tipos de card',
        description: 'Cada tipo de card vira um tipo de pergunta, do conceito ao caso clínico.',
        benefits: [
          'Conceito com resumo e fonte',
          'Fluxograma de conduta com passos ordenados',
          'Imagem com oclusão e caso clínico em estágios',
        ],
      },
      {
        title: 'Desafio dentro do mapa',
        description: 'O mapa te pergunta de volta. O card testado ganha destaque e os vizinhos aparecem como pista, nunca como resposta.',
        benefits: [
          'Card oculto, conexão, próximo passo, imagem e caso',
          'A fila escolhe o modo certo para cada card',
          'Escreva, escolha ou fale a resposta',
        ],
      },
      {
        title: 'Correção com fonte',
        description: 'Errou? Você descobre o que faltou, e de onde vem a resposta.',
        benefits: [
          'Corrigida contra uma rubrica com fonte',
          'Mostra o que você acertou e o que faltou',
          'Discordou? A revisão editorial decide e avisa você',
        ],
        benefitsApproved: [
          'Corrigida contra uma rubrica revisada por médico',
          'Mostra o que você acertou e o que faltou',
          'Discordou? A revisão editorial decide e avisa você',
        ],
      },
      {
        title: 'Lembrança estimada',
        description: 'O FSRS, algoritmo aberto que o Anki também oferece, calcula a chance de lembrar cada conceito hoje e pinta o seu mapa.',
        benefits: [
          'Cada card tem a sua própria curva',
          'Mapa de calor: Revisitar, Acompanhar, Mais estável',
          'Revisar hoje já vem na ordem certa',
        ],
      },
      {
        title: 'Cobertura do Enamed',
        description: 'Vincule seus mapas aos itens da matriz de referência e veja onde você já está e por onde seguir.',
        benefits: [
          'Cobertura por grande área',
          'Lembrança média por tópico',
          'Cobertura de conteúdo não é peso de prova',
        ],
      },
      {
        title: 'Banco de questões',
        description: 'Pratique por assunto, no modo estudo ou em simulado. A correção mostra o que acertou e o que revisar.',
        benefits: [
          'Filtre por assunto e monte o treino',
          'Estudo com correção na hora, ou simulado só no fim',
          'Caderno de erros com o que você errou',
        ],
      },
    ],
    tablistAria: 'Recursos',
  },

  // Feature alt texts (for the 6 explorer images) — default safe, approved variant with medical claims
  featureAlts: {
    map: 'O mapa de conceitos da plataforma, com cards ligados por conexões com nome',
    cards: 'Os quatro tipos de card: conceito, fluxograma, imagem com oclusão e caso clínico',
    challenge: 'O desafio dentro do mapa, com o card testado em destaque e o painel de pergunta',
    grading: 'A correção com fonte: resposta, veredito parcial e rubrica com fonte',
    gradingApproved: 'A correção com fonte: resposta, veredito parcial e rubrica revisada por médico',
    fsrs: 'A curva de lembrança estimada com revisões e o mapa de calor por estado',
    enamed: 'A cobertura da matriz do Enamed por grande área',
    bank: 'O banco de questões, com uma questão e as alternativas',
  },

  // Grading section — default safe, approved variant with medical claims
  grading: {
    title: 'Errou? Você descobre o que faltou, com fonte.',
    text: 'Escreva ou fale sua resposta. A correção compara com uma rubrica com fonte e mostra o que você acertou, o que faltou e de onde vem. Discordou? Vai para a revisão editorial, e você fica sabendo.',
    textApproved: 'Escreva ou fale sua resposta. A correção compara com uma rubrica revisada por médico e mostra o que você acertou, o que faltou e de onde vem. Discordou? Vai para a revisão editorial, e você fica sabendo.',
    demoCaption: 'Parcial: acertou a droga, faltou o alvo de PAM ≥ 65 mmHg.',
  },

  // Memory section
  memory: {
    title: 'Lembrança estimada, não achismo.',
    text: 'O FSRS, algoritmo aberto que o Anki também oferece, calcula a chance de você lembrar cada conceito hoje e pinta seu mapa: Revisitar, Acompanhar, Mais estável. Você olha o mapa e sabe por onde começar.',
  },

  // Coverage section
  coverage: {
    title: 'Sua cobertura da matriz do Enamed, área por área.',
    text: 'Vincule mapas aos itens da matriz de referência e veja quanto já cobre, onde a lembrança está baixa e por onde seguir.',
    disclaimer: 'Cobertura de conteúdo não é peso de prova.',
  },

  // Mobile section
  mobile: {
    title: 'Revise entre um plantão e outro.',
    text: 'No celular, um desafio por vez, resposta por voz e instalação na tela inicial. Editar o mapa é no computador, onde ele cabe.',
  },

  // More section — governance variants for medical claims
  more: {
    eyebrow: 'E tem mais',
    title: 'Do seu material ao celular.',
    tiles: [
      {
        title: 'Do seu Anki e dos seus PDFs',
        text: 'Importe o .apkg e seus cards viram um mapa, com a oclusão de imagem junto. Envie um PDF e a IA monta um rascunho para você revisar.',
        alt: 'Um PDF e um arquivo do Anki virando um mapa de conceitos',
      },
      {
        title: 'Mapas prontos, revisados',
        text: 'Comece com mapas de Clínica Médica que já vêm com fonte, versão e o nome do revisor com CRM.',
        alt: 'Mapas prontos com selo de revisão e o painel de origem do card',
        approvedOnly: true,
      },
      {
        title: 'No celular, até por voz',
        text: 'Revise um desafio por vez, responda falando e instale na tela inicial. Editar o mapa fica no computador, onde ele cabe.',
        alt: 'A revisão no celular, com resposta por voz e notas',
      },
      {
        title: 'Procedência em cada card',
        text: 'Fonte, marco temporal e histórico de edição em cada card. Você sabe de onde vem cada resposta.',
        textApproved: 'Quem revisou, quando foi a última edição e qual o original. Tudo documentado.',
        alt: 'Interface de origem do card mostrando revisor, data e fonte',
      },
    ],
  },

  // Demo section — medical content (Sepse case)
  demo: {
    title: 'Experimente um desafio de Clínica Médica',
    noSignup: 'Sem cadastro',
    bundleTag: 'Pacote da 1ª hora',
    intro: 'Quatro passos do pacote da primeira hora na sepse. Responda e veja como o Remoa corrige e de onde vem a resposta.',
    flow: [
      'Dosar lactato',
      'Hemoculturas antes do antibiótico',
      'Antibiótico de amplo espectro',
      'Cristaloide 30 mL/kg se hipotensão ou lactato ≥ 4 mmol/L',
      'Passo 5',
    ],
    question: 'Depois de 30 mL/kg de cristaloide, a PAM segue em 58 mmHg. Qual é o passo 5?',
    nextStep: 'Próximo passo',
    progress: '{current} de {total}',
    alternatives: [
      'Iniciar noradrenalina com alvo de PAM ≥ 65 mmHg',
      'Repetir o lactato antes de qualquer outra medida',
      'Trocar o antibiótico por outro de amplo espectro',
      'Colher novas hemoculturas',
    ],
    alternativesLabel: 'Alternativas',
    correctIndex: 0,
    verdicts: {
      correct: 'Correto',
      incorrect: 'Ainda não',
    },
    verdictTitles: {
      correct: 'Isso mesmo.',
      incorrect: 'Não é esse o passo.',
    },
    explanationCorrect: 'Noradrenalina é o vasopressor de primeira linha quando a PAM segue abaixo de 65 mmHg durante ou após o volume. Alvo inicial: PAM ≥ 65 mmHg.',
    explanationIncorrect: 'O passo 5 é iniciar noradrenalina, com alvo de PAM ≥ 65 mmHg, se a hipotensão persistir durante ou após o volume. Lactato, hemoculturas e antibiótico vêm antes.',
    source: 'Fonte: Surviving Sepsis Campaign, atualização do pacote 2018 (Levy et al.) e diretriz 2021 (Evans et al., Crit Care Med).',
    retry: 'Tentar de novo',
    cta: 'Criar meu primeiro mapa',
    demoLabel: 'Conteúdo de demonstração',
    ariaLive: 'Veredito: {verdict}. {explanation}',
  },

  // Comparison section — generic names, versioned for governance
  compare: {
    eyebrow: 'Comparação',
    title: 'Use com o Anki. Ou no lugar dele.',
    scrollLabel: 'Tabela de comparação',
    featureHeader: 'Recurso',
    yes: 'Sim',
    notNative: 'Não nativo',
    footnote: 'Recursos nativos de cada produto, conforme a documentação pública em {month}/{year}. Anki, Notion e Miro são marcas de seus titulares; o Remoa não tem vínculo com eles.',
    columns: {
      remoa: 'Remoa',
      anki: 'Anki',
      notion: 'Quadros e notas',
    },
    rows: [
      { feature: 'Revisão espaçada', remoa: 'Sim', anki: 'Sim', notion: 'Não nativo' },
      { feature: 'Mapa de conexões', remoa: 'Sim', anki: 'Não nativo', notion: 'Sim' },
      { feature: 'Perguntas geradas das conexões', remoa: 'Sim', anki: 'Não nativo', notion: 'Não nativo' },
      { feature: 'Correção da resposta com fonte', remoa: 'Sim', anki: 'Não nativo', notion: 'Não nativo' },
      { feature: 'Oclusão de imagem', remoa: 'Sim', anki: 'Sim', notion: 'Não nativo' },
      { feature: 'Cobertura por tema do Enamed', remoa: 'Sim', anki: 'Não nativo', notion: 'Não nativo' },
      { feature: 'Importa baralho do Anki (.apkg)', remoa: 'Sim', anki: 'Formato próprio', notion: 'Não nativo' },
      { feature: 'Banco de questões', remoa: 'Sim', anki: 'Não nativo', notion: 'Não nativo' },
    ],
  },

  // Pricing section — exact features from mock planos section
  plans: {
    eyebrow: 'Planos',
    title: 'Comece grátis. Pague quando o mapa virar hábito.',
    unavailable: 'Os preços estão indisponíveis agora. Tente de novo em instantes.',
    periodGroupLabel: 'Período de cobrança',
    period: {
      monthly: 'Mensal',
      annual: 'Anual',
      discount: 'Economize {pct}%',
    },
    free: {
      name: 'Free',
      description: 'Para começar a montar seus mapas.',
      trial: 'Toda conta nova começa com {days} dias de Pro grátis. Sem cartão.',
      features: [
        '{maps} mapas',
        '{cards} cards',
        '{pdfMaps, plural, =0 {Sem mapas gerados por PDF} one {# mapa gerado de PDF por mês} other {# mapas gerados de PDF por mês}}',
        '{ankiImports, plural, one {# importação do Anki} other {# importações do Anki}} de até {ankiCards} cards',
        '{dailyNewCards} novos cards por dia',
        '{aiCorrections} correções por IA por dia',
      ],
    },
    pro: {
      name: 'Pro',
      features: [
        'Mapas e cards ilimitados',
        '{aiCorrections} correções por IA por dia',
        '{pdfMaps} mapas gerados de PDF por mês',
        'Importação do Anki {ankiPro}',
        'Novos cards por dia: {dailyNewCardsPro}',
        'Mapas prontos (em breve)',
      ],
      featuresApproved: [
        'Mapas e cards ilimitados',
        '{aiCorrections} correções por IA por dia',
        '{pdfMaps} mapas gerados de PDF por mês',
        'Importação do Anki {ankiPro}',
        'Novos cards por dia: {dailyNewCardsPro}',
        'Mapas prontos revisados',
      ],
      price: 'R$ {price}/mês',
      priceAnnual: 'R$ {price}/ano',
      founder: 'Preço de fundador para quem entrar no beta',
    },
    limit: { unlimitedF: 'ilimitada', unlimitedM: 'ilimitados', upTo: 'de até {n} cards' },
    founder: {
      name: 'Founder',
      description: 'Compre uma vez e use para sempre.',
      features: [
        'Tudo do Pro',
        'Correções por IA ilimitadas',
        'Mapas gerados de PDF ilimitados',
        'Loja de mapas liberada (Em breve)',
        'As novidades primeiro',
      ],
    },
    cta: {
      founder: 'Quero ser Founder',
      free: 'Começar grátis',
      waitlist: 'Entrar na lista de espera',
      pro: 'Assinar o Pro',
    },
    notes: {
      monthly: 'Cobrado todo mês.',
      annual: 'Equivale a {price} por mês.',
      founder: 'Acesso vitalício',
    },
    cadence: {
      founder: 'pagamento único',
      monthly: '/mês',
      annual: '/ano',
    },
    footer: 'Cancele em um clique. Seus mapas continuam seus.',
  },

  // FAQ section
  faq: {
    eyebrow: 'Perguntas',
    title: 'Perguntas frequentes sobre o Remoa',
    items: [
      {
        q: 'Funciona com o Anki?',
        a: 'Sim. Importe seu arquivo .apkg e os cards viram mapa; a oclusão de imagem vem junto.',
      },
      {
        q: 'Para quem é o Remoa?',
        a: 'Para quem estuda para a residência médica: internos do 5º e 6º ano e recém-formados. A cobertura do Enamed começa por Clínica Médica; seus próprios mapas podem ser de qualquer tema.',
      },
      {
        q: 'O que é revisão espaçada e como o Remoa usa?',
        a: 'É revisar cada conteúdo perto do momento em que você o esqueceria, com intervalos que crescem a cada acerto. O Remoa calcula esses intervalos com o FSRS para cada card, mostra a lembrança estimada no mapa e junta na fila Revisar hoje o que vence no dia.',
      },
      {
        q: 'A correção por IA pode errar?',
        a: 'Pode. Por isso ela corrige contra uma rubrica com fonte e foi feita para não aceitar o que está fora dela. Se você discordar, a revisão editorial analisa e você recebe a resposta.',
        aApproved: 'Pode. Por isso ela corrige contra uma rubrica revisada por médico e nunca aprova o que está fora dela. Se você discordar, um revisor decide e você recebe a resposta.',
      },
      {
        q: 'Quem revisa o conteúdo pronto?',
        a: 'Médicos revisores, com nome e CRM em cada card aprovado e o marco temporal da edição.',
        approvedOnly: true,
      },
      {
        q: 'Serve para o Enamed 2027?',
        a: 'O Remoa organiza a cobertura por temas de Clínica Médica alinhados à matriz de referência do Enamed (Portaria Inep 478/2025). É uma curadoria própria, não oficial, e não indica peso de prova nem garante resultado.',
      },
      {
        q: 'Funciona no celular?',
        a: 'Sim, como app instalável. No celular você revisa; no computador você edita.',
      },
      {
        q: 'Preciso pagar para começar?',
        a: 'Não. Você começa no plano Free e só passa para o Pro se quiser; os valores estão na seção Planos.',
      },
      {
        q: 'Posso cancelar quando quiser?',
        a: 'Sim, em um clique, sem perder seus mapas.',
      },
      {
        q: 'A IA pode errar?',
        a: 'Pode. Por isso cada card mostra a origem e você sempre confere a fonte. Não envie dados de pacientes.',
      },
      {
        q: 'Como a IA corrige a minha resposta?',
        a: 'Você escreve com as suas palavras. A correção olha o sentido e o que está na fonte do card, e mostra o que você acertou e o que faltou. A nota é da IA, e ela pode errar.',
      },
      {
        q: 'O que acontece com meus dados?',
        a: 'Exportação e exclusão de conta a um clique, conforme a LGPD. Áudio de resposta por voz não é armazenado.',
      },
    ],
  },

  // CTA section (named ctaSection to avoid conflict with top-level cta key)
  ctaSection: {
    title: 'O que você aprende, fica.',
    text: 'Monte seu primeiro mapa em cinco minutos.',
    textWaitlist: 'Entre na lista e monte seu primeiro mapa quando abrirmos.',
    primary: 'Criar meu primeiro mapa',
    secondary: 'Entrar na lista de espera',
  },

  // Waitlist form
  waitlist: {
    title: 'Fique na lista',
    subtitle: 'O que você aprende, fica.',
    intro: 'Monte seu primeiro mapa em cinco minutos.',
    introWaitlist: 'Entre na lista e monte seu primeiro mapa quando abrirmos.',
    email: {
      label: 'Seu e-mail',
      placeholder: 'nome@universidade.br',
    },
    segment: {
      label: 'Você é',
      options: ['3º–4º ano', '5º–6º ano', 'Formado(a)'],
    },
    submit: 'Entrar na lista',
    honeypot: 'Website',
    honeypotLabel: 'Deixe em branco',
    consent: 'Usamos seu e-mail só para falar do Remoa. Você pode sair da lista quando quiser. Veja a Política de Privacidade.',
    validation: {
      emailRequired: 'E-mail obrigatório',
      emailInvalid: 'E-mail inválido',
      segmentRequired: 'Escolha uma opção',
    },
    errors: {
      submit: 'Não conseguimos processar agora. Tente de novo.',
      server: 'Erro ao processar. Tente de novo.',
      rateLimited: 'Muitas tentativas. Tente de novo mais tarde.',
    },
    success: {
      title: 'Você está na lista.',
      text: 'Enviamos um e-mail de confirmação. Fique de olho na sua caixa de entrada.',
      alternate: 'Usar outro e-mail',
    },
  },

  // Footer
  footer: {
    brand: 'Remoa',
    tagline: 'Conecte para lembrar.',
    navLabel: 'Links do rodapé',
    links: {
      howWorks: 'Como funciona',
      features: 'Recursos',
      plans: 'Planos',
      faq: 'Perguntas',
      terms: 'Termos',
      privacy: 'Privacidade',
      contact: 'Contato',
    },
    disclaimer: 'Ferramenta de estudo. Não substitui diretriz clínica nem supervisão.',
    copyright: 'Copyright © {year} Remoa.',
  },

  // SEO metadata
  // G11: 404 (root not-found.tsx)
  notFound: {
    title: 'Página não encontrada',
    text: 'O link pode ter mudado ou não existir mais.',
    home: 'Ir para a página inicial',
  },

  seo: {
    title: 'Remoa: IA, Enamed e calendário da residência médica',
    description: 'Mapas para a residência médica: a IA cria cards e corrige com fonte, mapas prontos do Enamed e calendário de provas.',
    ogTitle: 'O que você aprende, fica.',
    ogDescription: 'Mapas de medicina que te testam pela conexão.',
    orgName: 'Remoa',
    appCategory: 'EducationalApplication',
    // /llms.txt (llmstxt.org): resumo do produto para assistentes de IA.
    llms: {
      summary: 'O Remoa é um app de estudo para a residência médica: o aluno monta mapas de cards conectados, revisa na hora certa com revisão espaçada (FSRS) e usa o próprio mapa como teste.',
      details: 'Público: estudantes do 5º e 6º ano de medicina e médicos recém-formados que estudam para a residência. A primeira grande área é a Clínica Médica. Principais recursos: mapas de cards ligados por conexões com rótulo; fila diária "Revisar hoje"; modo "Desafiar este mapa" (card oculto, conexão, próximo passo, imagem e caso clínico); correção das respostas com fonte; cobertura da matriz do Enamed; importação de baralhos do Anki e de PDFs; mapas prontos com revisão editorial; revisão pelo celular. O conteúdo médico gerado por IA só é publicado depois de revisado por um médico.',
      pages: 'Páginas',
      blog: 'Blog',
      optional: 'Optional',
      blogIndex: 'Todos os artigos do blog',
      feed: 'Feed RSS',
      feedDescription: 'Os artigos mais recentes do blog.',
      sitemap: 'Sitemap',
      sitemapDescription: 'Todas as páginas públicas.',
    },
  },

  // Keep existing keys from F12 stub (do not remove)
  tagline: 'O que você aprende, fica.',
  subtitle: 'Monte o mapa do que você sabe e deixe ele te desafiar: revisão espaçada, correção com fonte e cobertura do Enamed. Comece com seu Anki, um PDF ou um mapa pronto.',
  cta: 'Criar meu primeiro mapa',
  signIn: 'Entrar',
} as const;
