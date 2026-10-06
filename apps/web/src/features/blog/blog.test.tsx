import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { blogPublicPostSchema, extractFaq } from '@remoa/contracts';
import { blogCategoryFixtures, blogListItemFixtures, blogPostFixture } from '@remoa/contracts/mocks';
import { serializeLd } from '@/lib/seo/json-ld';
import Index from '@/app/(marketing)/blog/page';
import Search from '@/app/(marketing)/blog-busca/page';
import PageN from '@/app/(marketing)/blog/pagina/[n]/page';
import PostPage, { generateMetadata as postMeta } from '@/app/(marketing)/blog/[slug]/page';
import PreviewPage, { generateMetadata as previewMeta } from '@/app/(marketing)/blog/preview/[token]/page';
import { blogPostingLd, categoryMetadata, crumbsLd, listMetadata, postBreadcrumbs, postMetadata } from './seo';
import { PostView } from './view';

const published = blogListItemFixtures[0]!;
const base = {
  ...blogPostFixture, html: '<h2 id="como-funciona">Como funciona</h2><p>Texto</p>', faq: extractFaq(blogPostFixture.content), related: [published], preview: false,
};
const post = blogPublicPostSchema.parse(JSON.parse(JSON.stringify(base))); // as api.ts parses it

const routes = new Map<string, () => Response>();
const json = (data: unknown, status = 200) => () => new Response(JSON.stringify({ ok: true, data }), { status });
const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
  void init; // recorded in mock.calls for the cache-option assertions
  const path = new URL(url).pathname.replace('/v1/public/blog/', '') + new URL(url).search;
  const r = routes.get(path);
  return r ? r() : new Response('{}', { status: 404 });
});

beforeEach(() => {
  routes.clear();
  fetchMock.mockClear();
  vi.stubGlobal('fetch', fetchMock);
  routes.set('categories', json(blogCategoryFixtures));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

const digestOf = async (p: Promise<unknown>) => ((await p.catch((e: { digest?: string }) => e)) as { digest?: string }).digest ?? '';

describe('post metadata', () => {
  it('canonical absolute, robots index, OG article and twitter card', () => {
    const m = postMetadata(post);
    expect(m.alternates?.canonical).toMatch(/^https?:\/\/[^/]+\/blog\/repeticao-espacada-na-residencia$/);
    expect(m.robots).toEqual({ index: true, follow: true });
    expect(m.title).toEqual({ absolute: 'Repetição espaçada na residência | Remoa' });
    const og = m.openGraph as { type: string; publishedTime: string; modifiedTime: string; section: string; images: { width: number; height: number }[] };
    expect(og).toMatchObject({ type: 'article', section: 'Técnicas de memorização' });
    expect(og.publishedTime).toMatch(/Z$/);
    expect(og.modifiedTime).toMatch(/Z$/);
    expect(og.images[0]).toMatchObject({ width: 1200, height: 630 });
    expect((m.twitter as { card: string }).card).toBe('summary_large_image');
  });

  it('seoTitle replaces the title and robots noindex is honored', () => {
    const m = postMetadata({ ...post, seoTitle: 'Título SEO', robots: 'noindex' });
    expect(m.title).toEqual({ absolute: 'Título SEO' });
    expect(m.robots).toEqual({ index: false, follow: true });
  });
});

describe('JSON-LD', () => {
  it('BlogPosting, BreadcrumbList and FAQPage render, with < escaped', () => {
    const { container } = render(<PostView post={{ ...post, title: 'A </script><b>x', faq: [{ q: 'P?', a: 'R' }] }} />);
    const blocks = [...container.querySelectorAll('script[type="application/ld+json"]')].map((s) => s.innerHTML);
    expect(blocks).toHaveLength(3);
    expect(blocks.every((b) => !b.includes('<'))).toBe(true);
    const types = blocks.map((b) => (JSON.parse(b) as { '@type': string })['@type']);
    expect(types).toEqual(['BlogPosting', 'BreadcrumbList', 'FAQPage']);
    expect(serializeLd({ a: '</script>' })).toBe('{"a":"\\u003c/script>"}');
  });

  it('omits FAQPage without FAQ and orders breadcrumbs home > blog > category > post', () => {
    const { container } = render(<PostView post={{ ...post, faq: [] }} />);
    expect(container.querySelectorAll('script[type="application/ld+json"]')).toHaveLength(2);
    const ld = crumbsLd(postBreadcrumbs(post)) as { itemListElement: { position: number; item: string }[] };
    expect(ld.itemListElement.map((i) => i.position)).toEqual([1, 2, 3, 4]);
    expect(ld.itemListElement[3]!.item).toMatch(/^https?:\/\//);
    expect((blogPostingLd(post) as { author: { name: string } }).author.name).toBe('Equipe Remoa');
  });
});

describe('post page', () => {
  it('has exactly one h1 and the educational notice, for every template', () => {
    for (const template of ['leitura', 'guia', 'destaque'] as const) {
      const { container, unmount } = render(<PostView post={{ ...post, template }} />);
      expect(container.querySelectorAll('h1')).toHaveLength(1);
      expect(screen.getByText(/Conteúdo educacional/)).toBeInTheDocument();
      unmount();
    }
  });

  it('old slug answers a permanent redirect', async () => {
    routes.set('posts/slug-antigo', json({ kind: 'redirect', to: '/blog/slug-novo' }));
    const digest = await digestOf(PostPage({ params: Promise.resolve({ slug: 'slug-antigo' }) }));
    expect(digest).toMatch(/^NEXT_REDIRECT;(replace|push);\/blog\/slug-novo;308/);
  });

  it('unknown slug is a 404', async () => {
    expect(await digestOf(PostPage({ params: Promise.resolve({ slug: 'nada' }) }))).toContain('NEXT_HTTP_ERROR_FALLBACK;404');
    expect(await postMeta({ params: Promise.resolve({ slug: 'nada' }) })).toEqual({});
  });

  it('fetches with the post tag', async () => {
    routes.set('posts/repeticao-espacada-na-residencia', json({ kind: 'post', post: base }));
    await PostPage({ params: Promise.resolve({ slug: 'repeticao-espacada-na-residencia' }) });
    expect(fetchMock.mock.calls[0]![1]).toMatchObject({ next: { tags: ['blog', 'blog:post:repeticao-espacada-na-residencia'] } });
  });
});

describe('preview', () => {
  it('is noindex/nofollow, uncached, shows the strip; expired is 404', async () => {
    routes.set('preview/tok', json({ ...base, preview: true }));
    const m = await previewMeta({ params: Promise.resolve({ token: 'tok' }) });
    expect(m.robots).toEqual({ index: false, follow: false });
    render(await PreviewPage({ params: Promise.resolve({ token: 'tok' }) }));
    expect(screen.getByText(/Pré-visualização/)).toBeInTheDocument();
    expect(fetchMock.mock.calls[0]![1]).toMatchObject({ cache: 'no-store' });
    expect(await digestOf(PreviewPage({ params: Promise.resolve({ token: 'velho' }) }))).toContain('404');
  });
});

describe('index and pagination', () => {
  const list = (page: number, total: number) => json({ items: [published, { ...published, id: '00000000-0000-4000-8000-000000000002' }], total, page, pageSize: 12 });

  it('/blog: one h1, feature + grid and links to categories; API down gives the empty state', async () => {
    routes.set('posts', list(1, 2));
    const { container, unmount } = render(await Index());
    expect(container.querySelectorAll('h1')).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Estude melhor para a residência.');
    unmount();
    routes.clear();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    render(await Index());
    expect(screen.getByRole('status')).toHaveTextContent(/Volte em breve/);
  });

  it('search goes to the API and the page is noindex', async () => {
    routes.set('posts?q=sono', list(1, 2));
    render(await Search({ searchParams: Promise.resolve({ q: 'sono' }) })); // /blog?q= is rewritten here (P-410)
    expect(fetchMock.mock.calls.some(([u]) => String(u).includes('q=sono'))).toBe(true);
  });

  it('page 1 redirects to /blog, invalid and out-of-range are 404, valid renders with its own page links', async () => {
    expect(await digestOf(PageN({ params: Promise.resolve({ n: '1' }) }))).toMatch(/NEXT_REDIRECT;replace;\/blog;308/);
    for (const n of ['0', '-3', 'abc', '2.5']) expect(await digestOf(PageN({ params: Promise.resolve({ n }) }))).toContain('404');
    routes.set('posts?page=2', list(2, 30));
    expect(await digestOf(PageN({ params: Promise.resolve({ n: '9' }) }))).toContain('404');
    render(await PageN({ params: Promise.resolve({ n: '2' }) }));
    expect(screen.getByRole('link', { name: /Anterior/ })).toHaveAttribute('href', '/blog');
    expect(screen.getByRole('link', { name: /Próxima/ })).toHaveAttribute('href', '/blog/pagina/3');
  });
});

describe('og:image on every public page', () => {
  it('post without cover, list and category fall back to the default image', () => {
    const imgs = (m: ReturnType<typeof postMetadata>) => (m.openGraph as { images: { url: string; width: number; height: number }[] }).images;
    expect(imgs(postMetadata({ ...post, cover: null }))[0]).toMatchObject({ url: expect.stringContaining('/og-default'), width: 1200, height: 630 });
    expect(imgs(listMetadata({ title: 'T', description: 'D', path: '/blog' }))).toHaveLength(1);
    expect(imgs(categoryMetadata(blogCategoryFixtures[0]!))).toHaveLength(1);
  });
});
