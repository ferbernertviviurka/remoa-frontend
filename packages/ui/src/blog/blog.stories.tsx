import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import {
  ArticleBody, AuthorBox, BlogCategoryChips, BlogGrid, BlogIndexHeader, BlogSearch, Breadcrumbs, EducationalNotice, FeaturedPost,
  LandingBlogSection, Pagination, PostCard, PostCta, PostHero, PostLayout, QuickSummary, RelatedPosts, Toc, blogStagger,
} from './index';
import { LegalDocument } from '../legal';
import { articleHtml, cover, legalSections, posts, toc } from './fixtures';
import type { BlogTemplate } from './types';

/**
 * Blog público (F27 T4). Regras: todo texto entra por props (o app passa `t('blog.*')`); sem `className`; um único `h1` por página (`PostHero`, `BlogIndexHeader`, `LegalDocument`);
 * capas sempre com `width`/`height`/`alt`; só a capa do topo é `priority` (`fetchpriority="high"`), as demais são `lazy`. O texto do post vem do renderizador como HTML sanitizado em `ArticleBody`
 * (contrato de classes no comentário do componente). Movimento por CSS (`motion.css`): título sobe 800 ms, cartões entram 500 ms com 70 ms entre eles (`blogStagger`), elevação 200 ms,
 * seção da Landing 600 ms, destaque do índice do Guia 200 ms; com "Reduzir movimento" tudo aparece no estado final. Cabeçalho e rodapé são do `SiteHeader`/`SiteFooter` do marketing.
 * Um template novo? Não: são 3 (`leitura`, `guia`, `destaque`), escolhidos no admin (`TemplatePicker`).
 */
const meta = { title: 'Blog/Público', parameters: { layout: 'fullscreen' } } satisfies Meta;
export default meta;
type S = StoryObj;

const crumbs = (dark?: boolean) => ({ label: 'Você está em', items: [{ label: 'Blog', href: '/blog' }, { label: 'Estratégia de estudo' }], tone: dark ? ('dark' as const) : ('light' as const) });
const common = {
  breadcrumbs: crumbs(), category: 'Estratégia de estudo', title: 'Como estudar para a residência médica: o guia completo',
  description: 'Um passo a passo para organizar o estudo, montar mapas de cada tema e revisar na hora certa até o dia da prova.', author: 'Equipe Remoa',
  meta: '2 de outubro de 2026 · 9 min de leitura', dateTime: '2026-10-02',
};
const cta = { title: 'Transforme o que você leu em um mapa.', text: 'Crie seu primeiro mapa de graça e revise na hora certa.', label: 'Criar meu primeiro mapa', href: '/cadastro' };
const author = { name: 'Equipe Remoa', bio: 'Quem constrói o Remoa e estuda como o Remoa. Conteúdo educacional, sem substituir diretriz clínica ou supervisão.' };
const related = posts.slice(0, 3);
const tocProps = { label: 'Índice', items: toc };

function Post({ template }: { template: BlogTemplate }) {
  const hero = (
    <PostHero
      {...common}
      template={template}
      breadcrumbs={crumbs(template === 'destaque')}
      badge={template === 'destaque' ? 'Lista · 7 min de leitura' : undefined}
      cover={cover(template === 'destaque' ? '#FDBA74' : '#6D5BD0', template === 'destaque' ? '#C2410C' : '#241A5C', 'Capa do artigo')}
    />
  );
  const body = <ArticleBody html={articleHtml} template={template} />;
  return (
    <div className="bg-surface pb-20">
      {hero}
      {template === 'guia' ? (
        <>
          <PostLayout layout="guide" aside={<Toc {...tocProps} variant="side" title="Neste guia" />}>
            <QuickSummary title="Resumo rápido" items={['Defina o que cai e o que pesa', 'Monte um mapa de cada tema', 'Revise na hora certa e treine com desafios']} />
            {body}
            <AuthorBox {...author} />
          </PostLayout>
          <PostCta variant="band" {...cta} />
        </>
      ) : (
        <PostLayout layout={template === 'destaque' ? 'narrow' : 'single'} aside={template === 'leitura' ? <Toc {...tocProps} title="Neste artigo" /> : undefined}>
          {body}
          <AuthorBox {...author} />
          <PostCta variant={template === 'destaque' ? 'dark' : 'light'} {...cta} />
        </PostLayout>
      )}
      <div className="px-5 md:px-10"><RelatedPosts title="Continue lendo" posts={related} /></div>
      <div className="mx-auto max-w-[700px] px-5"><EducationalNotice text="Conteúdo educacional. Não substitui diretriz clínica nem supervisão." /></div>
    </div>
  );
}

export const TemplateLeitura: S = { render: () => <Post template="leitura" /> };
export const TemplateGuia: S = { render: () => <Post template="guia" /> };
export const TemplateDestaque: S = { render: () => <Post template="destaque" /> };

function Index({ empty }: { empty?: boolean }) {
  const [feat, ...rest] = posts.slice().reverse();
  return (
    <div className="bg-surface">
      <BlogIndexHeader eyebrow="Blog" title="Estude melhor para a residência." lead="Guias, técnicas e rotinas para organizar o estudo, montar mapas e revisar na hora certa.">
        <BlogSearch action="/blog" label="Buscar no blog" placeholder="Buscar artigos" submitLabel="Buscar" />
        <BlogCategoryChips label="Categorias" items={[{ label: 'Todos', count: 12, href: '/blog', active: true }, { label: 'Estratégia de estudo', count: 4, href: '/blog/categoria/estrategia' }, { label: 'Técnicas de memorização', count: 5, href: '/blog/categoria/memorizacao' }, { label: 'Enamed e residência', count: 2, href: '/blog/categoria/enamed' }, { label: 'Produtividade', count: 1, href: '/blog/categoria/produtividade' }]} />
      </BlogIndexHeader>
      <div className="mx-auto flex max-w-[1200px] flex-col gap-7 px-4 pt-11 pb-6 md:px-10">
        {empty ? (
          <p className="py-14 text-center text-[17px] text-muted">Nenhum artigo encontrado. Tente outra categoria ou outra busca.</p>
        ) : (
          <>
            <FeaturedPost {...feat!} ctaLabel="Ler o artigo" />
            <BlogGrid>{rest.map((p, i) => <PostCard key={p.href} {...p} headingLevel={3} delay={blogStagger(i)} />)}</BlogGrid>
            <Pagination label="Paginação" prevLabel="Página anterior" nextLabel="Próxima página" prevHref={null} nextHref="/blog/pagina/2" pages={[1, 2, 3].map((n) => ({ number: n, href: n === 1 ? '/blog' : `/blog/pagina/${n}`, label: `Página ${n}`, current: n === 1 }))} />
          </>
        )}
        <PostCta variant="light" {...cta} />
      </div>
    </div>
  );
}
export const Indice: S = { render: () => <Index /> };
export const IndiceSemResultado: S = { render: () => <Index empty /> };

export const Cartoes: S = {
  render: () => (
    <div className="flex flex-col gap-8 bg-canvas p-8">
      <div className="grid gap-6 md:grid-cols-3">{posts.slice(0, 3).map((p) => <PostCard key={p.href} {...p} />)}</div>
      <div className="grid gap-5 md:grid-cols-3">{posts.slice(0, 3).map((p) => <PostCard key={p.href} {...p} variant="related" />)}</div>
      <div className="grid max-w-[520px] gap-3.5">{posts.slice(0, 3).map((p) => <PostCard key={p.href} {...p} variant="compact" />)}</div>
      <Breadcrumbs {...crumbs()} />
    </div>
  ),
};

export const LandingSecao: S = {
  render: () => (
    <div className="bg-canvas">
      <LandingBlogSection eyebrow="Blog" title="Aprenda a estudar melhor." lead="Guias e técnicas para organizar o estudo da residência, montar mapas e revisar na hora certa." moreLabel="Ver mais artigos" moreHref="/blog" posts={posts.slice().reverse().map((p) => ({ ...p, readingTime: p.readingTime.replace(' de leitura', '') }))} />
    </div>
  ),
};
export const LandingSecaoUmPost: S = { render: () => <LandingBlogSection eyebrow="Blog" title="Aprenda a estudar melhor." lead="Guias e técnicas." moreLabel="Ver mais artigos" moreHref="/blog" posts={posts.slice(0, 1)} /> };

const Doc = ({ title, id }: { title: string; id: string }) => (
  <div className="bg-surface">
    <LegalDocument
      eyebrow="Legal" title={title} lead="Regras de uso do Remoa. Ao criar uma conta ou usar o serviço, você declara que leu e concorda com elas." printLabel="Imprimir" tocLabel="Índice" tocTitle="Neste documento"
      meta={<>Versão <mark className="rb-pending">[versao]</mark> · atualizada em <mark className="rb-pending">[dataAtualizacao]</mark></>}
      notice={<><b>Rascunho para revisão jurídica.</b> Os trechos em destaque são variáveis do .env ou itens a confirmar. Não publique sem a revisão de um advogado.</>}
      sections={legalSections.map((s) => ({ ...s, id: `${id}-${s.id}` }))}
    />
  </div>
);
export const PaginaLegal: S = { render: () => <Doc title="Termos de Uso" id="t" /> };

export const BuscaEPaginacao: S = {
  render: function Render() {
    const [n, setN] = useState(2);
    return (
      <div className="flex flex-col gap-6 p-8">
        <BlogSearch action="/blog" label="Buscar no blog" placeholder="Buscar artigos" submitLabel="Buscar" defaultValue="repetição" hidden={{ categoria: 'memorizacao' }} />
        <Pagination label="Paginação" prevLabel="Página anterior" nextLabel="Próxima página" prevHref="/blog/pagina/1" nextHref={`/blog/pagina/${n + 1}`} pages={[1, 2, 3].map((x) => ({ number: x, href: `/blog/pagina/${x}`, label: `Página ${x}`, current: x === n }))} />
        <button type="button" onClick={() => setN((v) => (v % 3) + 1)}>Trocar página atual</button>
      </div>
    );
  },
};
