import type { BlogCover } from './types';
import type { PostCardProps } from './post-card';

/** Dados de exemplo para stories e testes (capas em SVG com os degradês dos mocks). Não vai para o produto. */
const svg = (a: string, b: string, w: number, h: number) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/><circle cx="${w * 0.18}" cy="${h * 0.3}" r="${h * 0.14}" fill="#fff" fill-opacity=".26"/><circle cx="${w * 0.82}" cy="${h * 0.68}" r="${h * 0.2}" fill="#fff" fill-opacity=".2"/></svg>`)}`;

export const cover = (a = '#6D5BD0', b = '#241A5C', alt = 'Capa do artigo', w = 1200, h = 630): BlogCover => ({ src: svg(a, b, w, h), alt, width: w, height: h });

export const posts: Omit<PostCardProps, 'variant'>[] = [
  { href: '/blog/repeticao-espacada', cover: cover('#C9BFFF', '#6D5BD0', 'Intervalos de revisão crescendo'), category: 'Técnicas de memorização', title: 'Repetição espaçada: como revisar na hora certa', description: 'Entenda por que revisar no intervalo certo ajuda a fixar o conteúdo e como aplicar isso sem planilha.', date: '29 set 2026', dateTime: '2026-09-29', readingTime: '6 min de leitura' },
  { href: '/blog/10-erros', cover: cover('#FDBA74', '#C2410C', 'Lista de erros de estudo'), category: 'Técnicas de memorização', title: '10 erros que fazem você esquecer o que estudou', description: 'Os deslizes mais comuns na hora de estudar e o que fazer no lugar de cada um deles.', date: '25 set 2026', dateTime: '2026-09-25', readingTime: '7 min de leitura' },
  { href: '/blog/mapas-mentais', cover: cover('#5EEAD4', '#0F766E', 'Mapa mental de um tema'), category: 'Técnicas de memorização', title: 'Mapas mentais para medicina: como montar e revisar', description: 'Como transformar um tema longo em um mapa de conceitos conectados que você consegue revisar e lembrar.', date: '20 set 2026', dateTime: '2026-09-20', readingTime: '8 min de leitura' },
  { href: '/blog/enamed-areas', cover: cover('#93C5FD', '#2563EB', 'Grandes áreas do Enamed'), category: 'Enamed e residência', title: 'Enamed: como organizar o estudo por grande área', description: 'Um roteiro para dividir o edital em áreas e priorizar o que mais cai.', date: '15 set 2026', dateTime: '2026-09-15', readingTime: '10 min de leitura' },
  { href: '/blog/guia-residencia', cover: cover('#6D5BD0', '#241A5C', 'Capa do guia'), category: 'Estratégia de estudo', title: 'Como estudar para a residência médica: o guia completo', description: 'Um passo a passo para organizar o estudo, montar mapas de cada tema e revisar na hora certa até o dia da prova.', date: '2 out 2026', dateTime: '2026-10-02', readingTime: '9 min de leitura' },
];

export const toc = [
  { id: 'h-1', title: 'Defina o que cai e o que pesa', level: 2 as const },
  { id: 'h-2', title: 'Monte um mapa de cada tema', level: 2 as const },
  { id: 'h-3', title: 'Revise na hora certa', level: 2 as const },
  { id: 'h-4', title: 'Treine com desafios e questões', level: 2 as const },
  { id: 'h-5', title: 'Perguntas frequentes', level: 2 as const },
];

/** HTML no contrato do renderizador (já sanitizado). */
export const articleHtml = `<p>Estudar para a residência médica é uma maratona. Quem chega bem não é quem estuda mais horas, e sim quem <strong>organiza</strong>, <strong>conecta</strong> e <strong>revisa</strong> no momento certo. Neste guia você vê como montar um método simples e sustentável.</p>
<h2 id="h-1">Defina o que cai e o que pesa</h2>
<p>Comece pelo edital e pelas provas anteriores da sua banca. Liste as grandes áreas e <a href="/#recursos">veja a cobertura de cada item da matriz</a> para saber onde estão os maiores buracos. Priorize o que é cobrado com mais frequência e o que você mais erra.</p>
<ul><li>Liste as grandes áreas e os temas de cada uma</li><li>Marque o que você já domina e o que ainda não viu</li><li>Reserve mais tempo para o que cai muito e você erra muito</li></ul>
<h2 id="h-2">Monte um mapa de cada tema</h2>
<p>Em vez de resumos lineares, conecte os conceitos: causas, critérios, condutas e exceções. Um mapa mostra <strong>como as ideias se ligam</strong>, e isso ajuda a lembrar na hora da prova.</p>
<figure><img src="${cover('#C9BFFF', '#6D5BD0', '', 960, 330).src}" alt="Exemplo de mapa de estudo com conceitos conectados" width="960" height="330" loading="lazy"><figcaption>Um mapa liga conceitos por relações como “causa” e “leva a”.</figcaption></figure>
<div class="rb-callout" role="note" data-variant="dica"><div><strong>Dica.</strong> Dê um nome à relação entre dois cards. É o rótulo da conexão que vira pergunta na hora de revisar.</div></div>
<div class="rb-callout" role="note" data-variant="atencao"><div><strong>Atenção.</strong> Confira doses e condutas na diretriz mais recente.</div></div>
<div class="rb-callout" role="note" data-variant="nota"><div><strong>Nota.</strong> O mapa não substitui a leitura da fonte.</div></div>
<h2 id="h-3">Revise na hora certa</h2>
<p>Revisar cedo demais desperdiça tempo; revisar tarde exige reaprender. A <a href="/blog/repeticao-espacada">repetição espaçada</a> propõe a próxima revisão no ponto em que você está prestes a esquecer.</p>
<blockquote>O que você revisa no momento certo fica. O que você só relê, passa.</blockquote>
<h2 id="h-4">Treine com desafios e questões</h2>
<ol><li>Responda sem olhar o card</li><li>Escreva a resposta com as suas palavras</li><li>Compare com a fonte e corrija</li><li>Marque o que errou para voltar logo</li></ol>
<a class="rb-button" href="/cadastro">Criar meu primeiro mapa</a>
<h2 id="h-5">Perguntas frequentes</h2>
<div class="rb-faq"><details class="rb-faq-item"><summary>Quantas horas por dia preciso estudar?</summary><p>Depende da sua rotina e do tempo até a prova. Mais importante que o número de horas é a regularidade e a revisão no momento certo.</p></details><details class="rb-faq-item"><summary>Posso usar o mesmo método para todas as áreas?</summary><p>Sim. O que muda é o tamanho dos mapas e a frequência de revisão de cada tema.</p></details></div>`;

export const legalSections = [
  { id: 's-1', title: 'Quem somos', html: '<p>O Remoa é oferecido por <mark class="rb-pending">[razaoSocial]</mark>, inscrita no CNPJ sob o nº <mark class="rb-pending">[cnpj]</mark>. Você pode falar conosco em contato@remoa.com.br.</p>' },
  { id: 's-2', title: 'O que é o Remoa', html: '<p>O Remoa é uma ferramenta de estudo. Você monta mapas com cards e conexões e revisa com um agendador de revisão espaçada.</p><p>É um serviço educacional: não oferece atendimento médico.</p>' },
  { id: 's-3', title: 'Cadastro e conta', html: '<ul><li>Para usar o Remoa você cria uma conta com e-mail e senha ou com o Google.</li><li>Você deve ter 18 anos ou mais <mark class="rb-pending">[confirmar]</mark>.</li></ul>' },
];
