import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { violations } from '../test-utils';
import {
  ArticleBody, AuthorBox, BlogCategoryChips, BlogPostList, BlogPostRow, BlogSearch, BlogStatusTabs, Breadcrumbs, FeaturedPost,
  LandingBlogSection, Pagination, PostCard, PostCta, PostHero, PublishBlockers, PublishPanel, QuickSummary, RelatedPosts, SeoPanel,
  SitemapCard, TemplatePicker, Toc, AutosaveIndicator,
} from './index';
import { LegalDocument } from '../legal';
import { articleHtml, cover, legalSections, posts, toc } from './fixtures';

const crumbs = { label: 'Você está em', items: [{ label: 'Blog', href: '/blog' }, { label: 'Estratégia' }] };
const hero = { breadcrumbs: crumbs, category: 'Estratégia', title: 'Título do post', description: 'Resumo', author: 'Equipe Remoa', meta: '2 de outubro · 9 min', cover: cover() };

describe('PostCard / FeaturedPost / RelatedPosts', () => {
  it('cartão é um link com capa dimensionada, alt e lazy; priority vira fetchpriority', async () => {
    const { container } = render(<main><PostCard {...posts[0]!} /><PostCard {...posts[1]!} priority variant="compact" /><FeaturedPost {...posts[2]!} ctaLabel="Ler o artigo" /></main>);
    const link = screen.getByRole('link', { name: /Repetição espaçada/ });
    expect(link).toHaveAttribute('href', '/blog/repeticao-espacada');
    const img = within(link).getByRole('img');
    expect(img).toHaveAttribute('width'); expect(img).toHaveAttribute('height'); expect(img).toHaveAttribute('loading', 'lazy');
    const eager = within(screen.getByRole('link', { name: /10 erros/ })).getByRole('img');
    expect(eager).toHaveAttribute('fetchpriority', 'high'); expect(eager).toHaveAttribute('loading', 'eager');
    expect(screen.getByRole('heading', { level: 2, name: /Mapas mentais/ })).toBeInTheDocument();
    expect(await violations(container)).toEqual([]);
  });
  it('Continue lendo mostra no máximo 3', () => {
    render(<RelatedPosts title="Continue lendo" posts={posts} />);
    expect(screen.getAllByRole('link')).toHaveLength(3);
  });
});

describe('navegação do índice', () => {
  it('chips são links com aria-current; paginação em links; busca é form GET', async () => {
    const { container } = render(
      <div>
        <BlogSearch action="/blog" label="Buscar no blog" placeholder="Buscar" submitLabel="Buscar" defaultValue="fsrs" hidden={{ categoria: 'x' }} />
        <BlogCategoryChips label="Categorias" items={[{ label: 'Todos', count: 3, href: '/blog', active: true }, { label: 'Enamed', count: 1, href: '/blog/categoria/enamed' }]} />
        <Pagination label="Paginação" prevLabel="Anterior" nextLabel="Próxima" prevHref={null} nextHref="/blog/pagina/2" pages={[{ number: 1, href: '/blog', label: 'Página 1', current: true }, { number: 2, href: '/blog/pagina/2', label: 'Página 2' }]} />
        <Breadcrumbs {...crumbs} />
      </div>,
    );
    const form = screen.getByRole('search');
    expect(form).toHaveAttribute('method', 'get');
    expect(screen.getByLabelText('Buscar no blog')).toHaveValue('fsrs');
    expect(container.querySelector('input[type=hidden][name=categoria]')).toHaveAttribute('value', 'x');
    expect(screen.getByRole('link', { name: /Todos/ })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: /Enamed/ })).not.toHaveAttribute('aria-current');
    expect(screen.getByRole('link', { name: 'Página 1' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Próxima' })).toHaveAttribute('href', '/blog/pagina/2');
    expect(screen.getByRole('link', { name: 'Anterior' })).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByText('Estratégia')).toHaveAttribute('aria-current', 'page');
    expect(await violations(container)).toEqual([]);
  });
  it('paginação com uma página não renderiza', () => {
    const { container } = render(<Pagination label="P" prevLabel="a" nextLabel="b" pages={[{ number: 1, href: '/', label: '1', current: true }]} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('PostHero', () => {
  it.each(['leitura', 'guia', 'destaque'] as const)('%s tem um único h1', async (template) => {
    const { container } = render(<PostHero {...hero} template={template} badge={template === 'destaque' ? 'Lista · 7 min de leitura' : undefined} />);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('img', { name: 'Capa do artigo' })).toHaveAttribute('fetchpriority', 'high');
    if (template === 'destaque') expect(screen.getByText('Lista · 7 min de leitura')).toBeInTheDocument();
    expect(await violations(container)).toEqual([]);
  });
});

describe('Toc', () => {
  const observers: { cb: IntersectionObserverCallback }[] = [];
  beforeEach(() => {
    observers.length = 0;
    vi.stubGlobal('IntersectionObserver', class { constructor(cb: IntersectionObserverCallback) { observers.push({ cb }); } observe() {} disconnect() {} unobserve() {} takeRecords() { return []; } });
  });
  afterEach(() => vi.unstubAllGlobals());

  it('inline lista os links âncora', async () => {
    const { container } = render(<Toc label="Índice" title="Neste artigo" items={toc} />);
    expect(screen.getByRole('link', { name: 'Revise na hora certa' })).toHaveAttribute('href', '#h-3');
    expect(await violations(container)).toEqual([]);
  });
  it('lateral destaca o H2 visível e recolhe no celular com botão', async () => {
    document.body.insertAdjacentHTML('beforeend', toc.map((t) => `<h2 id="${t.id}">${t.title}</h2>`).join(''));
    render(<Toc label="Índice" title="Neste guia" items={toc} variant="side" toggleLabel="Neste guia" />);
    act(() => observers[0]!.cb([{ isIntersecting: true, target: document.getElementById('h-2')! } as unknown as IntersectionObserverEntry], {} as IntersectionObserver));
    expect(screen.getByRole('link', { name: 'Monte um mapa de cada tema' })).toHaveAttribute('aria-current', 'location');
    expect(screen.getByRole('link', { name: 'Defina o que cai e o que pesa' })).not.toHaveAttribute('aria-current');
    const toggle = screen.getByRole('button', { name: 'Neste guia' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    document.querySelectorAll('body > h2').forEach((e) => e.remove());
  });
});

describe('ArticleBody e blocos de fechamento', () => {
  it('injeta o HTML e marca o template', async () => {
    const { container } = render(<main><ArticleBody html={articleHtml} template="destaque" /><QuickSummary title="Resumo rápido" items={['a', 'b']} /><AuthorBox name="Equipe Remoa" bio="Bio" /><PostCta variant="dark" title="Crie" text="t" label="Criar meu primeiro mapa" href="/cadastro" /></main>);
    const body = container.querySelector('.rb-article')!;
    expect(body).toHaveAttribute('data-template', 'destaque');
    expect(body.querySelectorAll('h2[id]').length).toBe(5);
    expect(body.querySelector('.rb-callout[data-variant="dica"]')).not.toBeNull();
    expect(body.querySelector('.rb-faq > details.rb-faq-item > summary')).not.toBeNull();
    expect(body.querySelector('figure > img + figcaption')).not.toBeNull();
    expect(screen.getAllByRole('link', { name: 'Criar meu primeiro mapa' }).every((a) => a.getAttribute('href') === '/cadastro')).toBe(true);
    expect(await violations(container)).toEqual([]);
  });
  it('CTA e resumo vazio', () => {
    const { container } = render(<QuickSummary title="x" items={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('LandingBlogSection', () => {
  const props = { eyebrow: 'Blog', title: 'Aprenda a estudar melhor.', lead: 'Lead', moreLabel: 'Ver mais artigos', moreHref: '/blog' };
  it('com lista vazia não renderiza nada', () => {
    const { container } = render(<LandingBlogSection {...props} posts={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
  it('1 destaque + até 4 compactos e dois botões "Ver mais artigos"', async () => {
    const { container } = render(<LandingBlogSection {...props} posts={[...posts, ...posts]} />);
    expect(screen.getByRole('heading', { level: 2, name: 'Aprenda a estudar melhor.' })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /Ver mais artigos/ })).toHaveLength(2);
    expect(container.querySelectorAll('a[href^="/blog/"]').length).toBe(5);
    expect(await violations(container)).toEqual([]);
  });
  it('com 3 posts mostra os 3', () => {
    const { container } = render(<LandingBlogSection {...props} posts={posts.slice(0, 3)} />);
    expect(container.querySelectorAll('a[href^="/blog/"]').length).toBe(3);
  });
});

describe('LegalDocument', () => {
  it('numera o índice, destaca pendências e imprime', async () => {
    const print = vi.fn();
    vi.stubGlobal('print', print);
    const { container } = render(
      <LegalDocument eyebrow="Legal" title="Termos de Uso" lead="Lead" meta={<>Versão <mark className="rb-pending">[versao]</mark></>} printLabel="Imprimir" tocLabel="Índice" tocTitle="Neste documento" notice="Rascunho" sections={legalSections} />,
    );
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 2, name: '2. O que é o Remoa' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Cadastro e conta/ })).toHaveAttribute('href', '#s-3');
    expect(container.querySelectorAll('mark.rb-pending').length).toBeGreaterThan(2);
    await userEvent.click(screen.getByRole('button', { name: 'Imprimir' }));
    expect(print).toHaveBeenCalledTimes(1);
    expect(container.querySelector('.rb-noprint')).not.toBeNull();
    expect(await violations(container)).toEqual([]);
    vi.unstubAllGlobals();
  });
});

describe('Admin: SitemapCard', () => {
  it('abre a tabela de URLs e atualiza com o botão ocupado', async () => {
    let done!: () => void;
    const onRefresh = vi.fn(() => new Promise<void>((r) => { done = r; }));
    const { container } = render(
      <SitemapCard title="Sitemap: 2 URLs" description="Atualizado hoje às 03:00" urls={[{ path: '/', type: 'Página', lastmod: '2026-10-02' }, { path: '/blog', type: 'Lista', lastmod: '2026-10-02' }]} columns={{ path: 'Endereço', type: 'Tipo', lastmod: 'lastmod' }} showUrlsLabel="Ver URLs" hideUrlsLabel="Ocultar URLs" sitemapHref="/sitemap.xml" sitemapLabel="sitemap.xml" refreshLabel="Atualizar agora" onRefresh={onRefresh} />,
    );
    expect(screen.queryByRole('table')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Ver URLs' }));
    expect(screen.getByRole('button', { name: 'Ocultar URLs' })).toHaveAttribute('aria-expanded', 'true');
    expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(3);
    await userEvent.click(screen.getByRole('button', { name: 'Atualizar agora' }));
    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Atualizar agora' })).toBeDisabled();
    await act(async () => done());
    expect(screen.getByRole('button', { name: 'Atualizar agora' })).toBeEnabled();
    expect(screen.getByRole('link', { name: /sitemap\.xml/ })).toHaveAttribute('href', '/sitemap.xml');
    expect(await violations(container)).toEqual([]);
  });
});

describe('Admin: lista de posts', () => {
  const labels = { edit: 'Editar', view: 'Ver', duplicate: 'Duplicar', unpublish: 'Despublicar' };
  it('filtros chamam onChange e a linha expõe as ações', async () => {
    const onChange = vi.fn(); const onUnpublish = vi.fn(); const onDuplicate = vi.fn();
    const { container } = render(
      <div>
        <BlogStatusTabs summary={[{ status: 'published', label: 'publicados', count: 2 }]} filtersLabel="Status" filters={[{ key: 'all', label: 'Todos' }, { key: 'draft', label: 'Rascunhos' }]} value="all" onChange={onChange} />
        <BlogPostList label="Posts" columns={{ post: 'Post', category: 'Categoria', template: 'Template', status: 'Status', date: 'Data', actions: 'Ações' }} empty="Nada">
          <BlogPostRow coverSrc="/c.webp" title="Meu post" slug="meu-post" category="Estratégia" templateLabel="Guia" status="published" statusLabel="Publicado" date="2 out" editHref="/admin/blog/1" viewHref="/blog/meu-post" canUnpublish labels={labels} onDuplicate={onDuplicate} onUnpublish={onUnpublish} />
          <BlogPostRow coverSrc="/c.webp" title="Rascunho" slug="rascunho" category="Estratégia" templateLabel="Leitura" status="draft" statusLabel="Rascunho" date="hoje" editHref="/admin/blog/2" labels={labels} />
        </BlogPostList>
      </div>,
    );
    expect(screen.getByRole('button', { name: 'Todos' })).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(screen.getByRole('button', { name: 'Rascunhos' }));
    expect(onChange).toHaveBeenCalledWith('draft');
    expect(screen.getByText('/blog/meu-post')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Despublicar: Meu post' }));
    await userEvent.click(screen.getByRole('button', { name: 'Duplicar: Meu post' }));
    expect(onUnpublish).toHaveBeenCalledTimes(1); expect(onDuplicate).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: 'Despublicar: Rascunho' })).toBeNull();
    expect(screen.getAllByText('Ver').filter((e) => e.closest('[aria-disabled="true"]')).length).toBe(1);
    expect(await violations(container)).toEqual([]);
  });
  it('lista vazia mostra a mensagem', () => {
    render(<BlogPostList label="Posts" columns={{ post: 'Post', category: 'C', template: 'T', status: 'S', date: 'D', actions: 'A' }} empty="Nenhum post com esses filtros." isEmpty />);
    expect(screen.getByText('Nenhum post com esses filtros.')).toBeInTheDocument();
  });
});

const opts = [{ value: 'leitura' as const, name: 'Leitura', description: 'd1' }, { value: 'guia' as const, name: 'Guia', description: 'd2' }, { value: 'destaque' as const, name: 'Destaque', description: 'd3' }];

describe('Admin: TemplatePicker', () => {
  it('escolhe o template', async () => {
    const onChange = vi.fn();
    const { container } = render(<TemplatePicker label="Template" value="leitura" onChange={onChange} options={opts} />);
    expect(screen.getByRole('button', { name: /Leitura/ })).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(screen.getByRole('button', { name: /Destaque/ }));
    expect(onChange).toHaveBeenCalledWith('destaque');
    expect(await violations(container)).toEqual([]);
  });
});

describe('Admin: SeoPanel', () => {
  const labels = { preview: 'Como aparece no Google', titleLabel: 'Título para o Google', titleHint: 'Vazio usa o título', slugLabel: 'Endereço (slug)', slugHint: '301', keywordLabel: 'Palavra-chave principal', keywordPlaceholder: 'Ex.', indexLabel: 'Permitir que o Google indexe', indexNote: 'entra no sitemap', noindexNote: 'noindex', checklist: 'Checklist de SEO' };
  const items = Array.from({ length: 10 }, (_, i) => ({ id: `${i}`, title: `Item ${i + 1}`, hint: 'dica', state: (i < 6 ? 'ok' : i < 8 ? 'warn' : 'error') as 'ok' | 'warn' | 'error' }));
  function setup(seoTitle = 'Título') {
    const on = { title: vi.fn(), slug: vi.fn(), kw: vi.fn(), ix: vi.fn() };
    const utils = render(<SeoPanel labels={labels} site="remoa.com.br" postTitle="Título do post" description="Descrição do post" seoTitle={seoTitle} onSeoTitleChange={on.title} slug="meu-post" onSlugChange={on.slug} keyword="" onKeywordChange={on.kw} indexable onIndexableChange={on.ix} items={items} score={6} total={10} />);
    return { ...utils, on };
  }
  it('contador, prévia do Google, checklist com 10 itens e barra de pontuação', async () => {
    const { container } = setup('Título');
    expect(screen.getByText('6/60')).toBeInTheDocument();
    const prev = screen.getByRole('group', { name: 'Como aparece no Google' });
    expect(within(prev).getByText('Título')).toBeInTheDocument();
    expect(within(prev).getByText(/remoa.com.br › blog › meu-post/)).toBeInTheDocument();
    expect(container.querySelectorAll('li[data-state]')).toHaveLength(10);
    const bar = screen.getByRole('progressbar', { name: 'Checklist de SEO' });
    expect(bar).toHaveAttribute('aria-valuenow', '6');
    expect(bar.firstElementChild).toHaveStyle({ width: '60%' });
    expect(await violations(container)).toEqual([]);
  });
  it('sem título SEO a prévia usa o título do post; acima de 60 sinaliza', async () => {
    setup('');
    expect(within(screen.getByRole('group', { name: 'Como aparece no Google' })).getByText('Título do post')).toBeInTheDocument();
    document.body.innerHTML = '';
    setup('x'.repeat(61));
    expect(screen.getByText('61/60').className).toContain('text-review-text');
  });
  it('edita os campos e o interruptor de indexação', async () => {
    const { on } = setup();
    await userEvent.type(screen.getByLabelText('Palavra-chave principal'), 'a');
    expect(on.kw).toHaveBeenCalledWith('a');
    await userEvent.click(screen.getByRole('switch', { name: 'Permitir que o Google indexe' }));
    expect(on.ix).toHaveBeenCalledWith(false);
  });
});

describe('Admin: PublishPanel, autosave e bloqueios', () => {
  function setup(status: 'draft' | 'scheduled' | 'published', error?: string) {
    const on = { status: vi.fn(), at: vi.fn() };
    const utils = render(
      <PublishPanel
        labels={{ template: 'Template', status: 'Status', scheduleAt: 'Publicar em', scheduleHint: 'Horário de Brasília', category: 'Categoria', author: 'Autor', viewOnSite: 'Ver no site' }}
        templatePicker={{ value: 'leitura', onChange: () => {}, options: opts }} template="leitura"
        statusOptions={[{ value: 'draft', label: 'Rascunho' }, { value: 'scheduled', label: 'Agendado' }, { value: 'published', label: 'Publicado' }]} status={status} onStatusChange={on.status}
        scheduleAt="" onScheduleAtChange={on.at} scheduleError={error}
        categories={[{ value: 'a', label: 'Estratégia' }]} category="a" onCategoryChange={() => {}} authors={[{ value: 'e', label: 'Equipe Remoa' }]} author="e" onAuthorChange={() => {}} viewHref="/blog/x"
      />,
    );
    return { ...utils, on };
  }
  it('"Ver no site" fica desabilitado até publicar', async () => {
    const { container } = setup('draft');
    const off = screen.getByRole('link', { name: /Ver no site/ });
    expect(off).toHaveAttribute('aria-disabled', 'true');
    expect(off).not.toHaveAttribute('href');
    expect(await violations(container)).toEqual([]);
  });
  it('publicado: link ativo em nova aba', () => {
    setup('published');
    const a = screen.getByRole('link', { name: /Ver no site/ });
    expect(a).toHaveAttribute('href', '/blog/x'); expect(a).toHaveAttribute('rel', 'noopener');
  });
  it('agendado pede data e mostra o erro; trocar status chama onChange', async () => {
    const { on } = setup('scheduled', 'Escolha uma data futura');
    expect(screen.getByLabelText('Publicar em')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent('Escolha uma data futura');
    await userEvent.click(screen.getByRole('button', { name: 'Publicado' }));
    expect(on.status).toHaveBeenCalledWith('published');
  });
  it('autosave anuncia o estado e os bloqueios listam o que falta', () => {
    const { rerender } = render(<AutosaveIndicator state="saving" text="Salvando…" />);
    expect(screen.getByRole('status')).toHaveTextContent('Salvando…');
    rerender(<AutosaveIndicator state="saved" text="Salvo agora" />);
    expect(screen.getByRole('status')).toHaveAttribute('data-state', 'saved');
    render(<PublishBlockers title="Falta resolver:" items={['descrição', 'capa']} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Falta resolver: descrição, capa');
    const { container } = render(<PublishBlockers title="x" items={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
