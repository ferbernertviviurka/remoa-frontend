import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import {
  AutosaveIndicator, BlogPostList, BlogPostRow, BlogStatusTabs, PublishBlockers, PublishPanel, SeoPanel, SitemapCard, TemplatePicker,
  type BlogStatus, type PublishStatus, type SeoCheckItem,
} from './index';
import { cover } from './fixtures';
import type { BlogTemplate } from './types';

/**
 * Admin do blog (F27 T4; telas `/admin/blog` e `/admin/blog/[id]`). Texto sempre por props, sem `className`. Despublicar e excluir usam o `ReasonDialog` do admin (motivo ≥ 8 caracteres,
 * auditoria no servidor); "Novo post" é um `Dialog` com título + `TemplatePicker layout="grid"`; a confirmação de publicar é um `Dialog` com `PublishBlockers`. O painel lateral do editor
 * usa `Tabs` (Publicação | SEO) com `PublishPanel` e `SeoPanel`. Movimento: linhas entram 450 ms (40 ms entre elas), barra do SEO 500 ms, troca de status/template 200 ms, janelas `pop` 400 ms.
 */
const meta = { title: 'Blog/Admin', parameters: { layout: 'fullscreen' } } satisfies Meta;
export default meta;
type S = StoryObj;

const urls = [{ path: '/', type: 'Página', lastmod: '2026-10-02' }, { path: '/blog', type: 'Lista', lastmod: '2026-10-02' }, { path: '/blog/guia-residencia', type: 'Post', lastmod: '2026-10-02' }, { path: '/termos-de-uso', type: 'Legal', lastmod: '2026-09-01' }];
const rows: { title: string; slug: string; status: BlogStatus; label: string; tpl: string; date: string }[] = [
  { title: 'Como estudar para a residência médica: o guia completo', slug: 'guia-residencia', status: 'published', label: 'Publicado', tpl: 'Guia', date: '2 out 2026' },
  { title: '10 erros que fazem você esquecer o que estudou', slug: '10-erros', status: 'scheduled', label: 'Agendado', tpl: 'Destaque', date: '9 out 2026, 09:00' },
  { title: 'Mapas mentais para medicina', slug: 'mapas-mentais', status: 'draft', label: 'Rascunho', tpl: 'Leitura', date: 'Editado há 2 h' },
  { title: 'Planilha de revisão (antigo)', slug: 'planilha-antigo', status: 'archived', label: 'Arquivado', tpl: 'Leitura', date: '1 jun 2026' },
];

export const Lista: S = {
  render: function Render() {
    const [f, setF] = useState<'all' | BlogStatus>('all');
    const shown = rows.filter((r) => f === 'all' || r.status === f);
    return (
      <div className="flex flex-col gap-4 bg-canvas p-6">
        <SitemapCard
          title="Sitemap: 42 URLs" description="Atualizado hoje às 03:00 · próxima atualização automática amanhã às 03:00 (Brasília) · também atualiza ao publicar ou despublicar"
          urls={urls} columns={{ path: 'Endereço', type: 'Tipo', lastmod: 'lastmod' }} showUrlsLabel="Ver URLs" hideUrlsLabel="Ocultar URLs" sitemapHref="/sitemap.xml" sitemapLabel="sitemap.xml" refreshLabel="Atualizar agora"
          onRefresh={() => new Promise((r) => setTimeout(r, 800))}
        />
        <BlogStatusTabs
          summary={[{ status: 'published', label: 'publicados', count: 1 }, { status: 'scheduled', label: 'agendados', count: 1 }, { status: 'draft', label: 'rascunhos', count: 1 }, { status: 'archived', label: 'arquivados', count: 1 }]}
          filtersLabel="Status" filters={[{ key: 'all', label: 'Todos' }, { key: 'published', label: 'Publicados' }, { key: 'scheduled', label: 'Agendados' }, { key: 'draft', label: 'Rascunhos' }, { key: 'archived', label: 'Arquivados' }]} value={f} onChange={setF}
        />
        <BlogPostList label="Posts" columns={{ post: 'Post', category: 'Categoria', template: 'Template', status: 'Status', date: 'Data', actions: 'Ações' }} empty="Nenhum post com esses filtros." isEmpty={shown.length === 0}>
          {shown.map((r, i) => (
            <BlogPostRow
              key={r.slug} coverSrc={cover('#6D5BD0', '#241A5C', '', 152, 96).src} title={r.title} slug={r.slug} category="Estratégia de estudo" templateLabel={r.tpl} status={r.status} statusLabel={r.label} date={r.date}
              editHref={`/admin/blog/${r.slug}`} viewHref={r.status === 'published' ? `/blog/${r.slug}` : undefined} canUnpublish={r.status === 'published' || r.status === 'scheduled'} delay={i * 45}
              labels={{ edit: 'Editar', view: 'Ver', duplicate: 'Duplicar', unpublish: 'Despublicar' }}
            />
          ))}
        </BlogPostList>
      </div>
    );
  },
};

const opts: { value: BlogTemplate; name: string; description: string }[] = [
  { value: 'leitura', name: 'Leitura', description: 'Artigo clássico, uma coluna. Para textos longos.' },
  { value: 'guia', name: 'Guia', description: 'Índice lateral e resumo. Para passo a passo.' },
  { value: 'destaque', name: 'Destaque', description: 'Capa escura e títulos numerados. Para listas.' },
];
export const NovoPostTemplates: S = {
  render: function Render() {
    const [t, setT] = useState<BlogTemplate>('leitura');
    return <div className="max-w-[820px] bg-surface p-7"><TemplatePicker label="Template" value={t} onChange={setT} options={opts} layout="grid" /></div>;
  },
};

const items = (title: string): SeoCheckItem[] => [
  { id: '1', title: 'Título entre 30 e 60 caracteres', hint: `${title.length} caracteres`, state: title.length >= 30 && title.length <= 60 ? 'ok' : 'warn' },
  { id: '2', title: 'Descrição entre 120 e 160 caracteres', hint: '152 caracteres', state: 'ok' },
  { id: '3', title: 'Endereço curto e sem acentos', hint: '/blog/guia-residencia', state: 'ok' },
  { id: '4', title: 'Capa com texto alternativo', hint: 'Falta o texto alternativo', state: 'error' },
  { id: '5', title: 'Pelo menos um H2', hint: '5 H2', state: 'ok' },
  { id: '6', title: 'Hierarquia sem pular níveis', hint: 'Sem H3 solto', state: 'ok' },
  { id: '7', title: 'Pelo menos 600 palavras', hint: '480 palavras', state: 'warn' },
  { id: '8', title: 'Palavra-chave no título, descrição, 1º parágrafo e endereço', hint: 'Falta no 1º parágrafo', state: 'warn' },
  { id: '9', title: 'Pelo menos um link interno e um externo', hint: '2 internos, 0 externos', state: 'warn' },
  { id: '10', title: 'Imagens do texto com alternativa', hint: 'Todas têm', state: 'ok' },
];

export const PainelDoEditor: S = {
  render: function Render() {
    const [tab, setTab] = useState<'pub' | 'seo'>('pub');
    const [tpl, setTpl] = useState<BlogTemplate>('guia');
    const [st, setSt] = useState<PublishStatus>('draft');
    const [at, setAt] = useState('');
    const [cat, setCat] = useState('estrategia');
    const [au, setAu] = useState('equipe');
    const [seoTitle, setSeoTitle] = useState('Como estudar para a residência médica: guia completo');
    const [slug, setSlug] = useState('guia-residencia');
    const [kw, setKw] = useState('estudar para residência médica');
    const [ix, setIx] = useState(true);
    const list = items(seoTitle);
    const score = list.filter((i) => i.state === 'ok').length;
    return (
      <div className="flex flex-col gap-4 bg-canvas p-6">
        <AutosaveIndicator state="saved" text="Salvo agora" />
        <aside aria-label="Publicação e SEO" className="w-[400px] max-w-full overflow-hidden rounded-[28px] border border-border bg-surface">
          <div role="tablist" aria-label="Painel" className="flex border-b border-border">
            {(['pub', 'seo'] as const).map((k) => (
              <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`h-14 flex-1 border-b-[3px] text-[15px] ${tab === k ? 'border-primary font-extrabold text-primary-deep' : 'border-transparent font-semibold text-muted'}`}>{k === 'pub' ? 'Publicação' : 'SEO'}</button>
            ))}
          </div>
          {tab === 'pub' ? (
            <PublishPanel
              labels={{ template: 'Template', status: 'Status', scheduleAt: 'Publicar em', scheduleHint: 'Horário de Brasília. O job de publicação roda a cada 5 minutos.', category: 'Categoria', author: 'Autor', viewOnSite: 'Ver no site' }}
              templatePicker={{ value: tpl, onChange: setTpl, options: opts }} template={tpl}
              statusOptions={[{ value: 'draft', label: 'Rascunho' }, { value: 'scheduled', label: 'Agendado' }, { value: 'published', label: 'Publicado' }]} status={st} onStatusChange={setSt}
              scheduleAt={at} onScheduleAtChange={setAt}
              categories={[{ value: 'estrategia', label: 'Estratégia de estudo' }, { value: 'memorizacao', label: 'Técnicas de memorização' }, { value: 'enamed', label: 'Enamed e residência' }]} category={cat} onCategoryChange={setCat}
              authors={[{ value: 'equipe', label: 'Equipe Remoa' }, { value: 'revisor', label: 'Revisão médica' }]} author={au} onAuthorChange={setAu}
              viewHref="/blog/guia-residencia"
            />
          ) : (
            <SeoPanel
              labels={{ preview: 'Como aparece no Google', titleLabel: 'Título para o Google', titleHint: 'Vazio usa o título do post.', slugLabel: 'Endereço (slug)', slugHint: 'Depois de publicado, mudar o endereço cria um redirecionamento 301.', keywordLabel: 'Palavra-chave principal', keywordPlaceholder: 'Ex.: estudar para residência médica', indexLabel: 'Permitir que o Google indexe', indexNote: 'O post entra no sitemap e pode aparecer no Google', noindexNote: 'noindex: o post não entra no sitemap', checklist: 'Checklist de SEO' }}
              site="remoa.com.br" postTitle="Como estudar para a residência médica: o guia completo" description="Um passo a passo para organizar o estudo, montar mapas de cada tema e revisar na hora certa até o dia da prova."
              seoTitle={seoTitle} onSeoTitleChange={setSeoTitle} slug={slug} onSlugChange={setSlug} keyword={kw} onKeywordChange={setKw} indexable={ix} onIndexableChange={setIx} items={list} score={score} total={list.length}
            />
          )}
        </aside>
        <PublishBlockers title="Falta resolver:" items={['descrição com 70 caracteres ou mais', 'texto alternativo da capa']} />
        <div className="flex gap-4"><AutosaveIndicator state="saving" text="Salvando…" /><AutosaveIndicator state="error" text="Falha ao salvar" /></div>
      </div>
    );
  },
};
