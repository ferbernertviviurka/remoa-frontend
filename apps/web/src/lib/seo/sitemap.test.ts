import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SITEMAP_STATIC_PATHS, type BlogListItem, type SitemapEntry } from '@remoa/contracts';
import robots from '@/app/robots';
import { buildRss } from './rss';
import { buildSitemap } from './sitemap';

const revalidateTag = vi.hoisted(() => vi.fn<(tag: string) => void>());
vi.mock('next/cache', () => ({ revalidateTag, revalidatePath: vi.fn() }));

const ORIGIN = 'https://exemplo.test';
const PRIVATE = ['/app', '/admin', '/api', '/entrar', '/cadastro', '/recuperar-senha', '/redefinir-senha', '/auth', '/dev'];
const d = (s: string) => new Date(s);
const entries: SitemapEntry[] = [
  { path: '/blog/categoria/estrategia', kind: 'category', lastmod: d('2026-10-03T10:00:00Z') },
  { path: '/blog/como-revisar', kind: 'post', lastmod: d('2026-10-03T10:00:00Z') },
  { path: '/blog/antigo', kind: 'post', lastmod: d('2026-09-01T10:00:00Z') },
  // never trusted, even if the API sent them
  { path: '/app/hoje', kind: 'post', lastmod: d('2026-10-04T00:00:00Z') },
  { path: '/admin/blog', kind: 'category', lastmod: d('2026-10-04T00:00:00Z') },
  { path: '/blog/preview/abc.def', kind: 'post', lastmod: d('2026-10-04T00:00:00Z') },
  { path: '/', kind: 'home', lastmod: d('2026-10-04T00:00:00Z') },
];

describe('sitemap (F27 FR-31/32)', () => {
  const map = buildSitemap(entries, { origin: ORIGIN, legalUpdatedAt: '2026-10-01' });
  const urls = map.map((u) => u.url);

  it('static public pages + only blog entries, absolute, no priority/changefreq', () => {
    expect(urls).toEqual([
      ORIGIN, `${ORIGIN}/blog`, `${ORIGIN}/termos-de-uso`, `${ORIGIN}/politica-de-privacidade`,
      `${ORIGIN}/blog/categoria/estrategia`, `${ORIGIN}/blog/como-revisar`, `${ORIGIN}/blog/antigo`,
    ]);
    for (const u of map) {
      expect(u.url.startsWith(`${ORIGIN}/`) || u.url === ORIGIN).toBe(true);
      expect(u).not.toHaveProperty('priority');
      expect(u).not.toHaveProperty('changeFrequency');
    }
  });

  it('no private, auth or preview URL', () => {
    for (const u of urls) {
      const path = u.slice(ORIGIN.length) || '/';
      for (const p of PRIVATE) expect(path === p || path.startsWith(`${p}/`)).toBe(false);
      expect(path).not.toContain('/preview/');
    }
  });

  it('lastmod in ISO 8601: newest post for / and /blog, LEGAL_UPDATED_AT for legal pages', () => {
    const at = Object.fromEntries(map.map((u) => [u.url, u.lastModified]));
    expect(at[ORIGIN]).toBe('2026-10-03T10:00:00.000Z');
    expect(at[`${ORIGIN}/blog`]).toBe('2026-10-03T10:00:00.000Z');
    expect(at[`${ORIGIN}/termos-de-uso`]).toBe('2026-10-01T00:00:00.000Z');
    expect(at[`${ORIGIN}/blog/antigo`]).toBe('2026-09-01T10:00:00.000Z');
  });

  it('API down: static pages only, without inventing dates', () => {
    const only = buildSitemap([], { origin: ORIGIN, legalUpdatedAt: '' });
    expect(only.map((u) => u.url)).toHaveLength(SITEMAP_STATIC_PATHS.length);
    expect(only.every((u) => u.lastModified === undefined)).toBe(true);
  });

  it('every static path is a real public page of the app', () => {
    const app = join(__dirname, '../../app');
    const groups = readdirSync(app).filter((g) => /^\(.+\)$/.test(g) && !['(app)', '(auth)'].includes(g));
    for (const path of SITEMAP_STATIC_PATHS) expect(groups.some((g) => existsSync(join(app, g, path, 'page.tsx'))), path).toBe(true);
  });
});

describe('robots.txt (F27 FR-35)', () => {
  const r = robots();
  const rule = Array.isArray(r.rules) ? r.rules[0]! : r.rules;
  const disallow = [rule.disallow].flat();

  it('allows the public site and points to the sitemap', () => {
    expect(rule.allow).toBe('/');
    expect(r.sitemap).toMatch(/^https?:\/\/.+\/sitemap\.xml$/);
  });

  it('blocks admin, api, app, auth screens and previews, but not the icons or /blog', () => {
    for (const p of ['/admin', '/api/', '/app/', '/app$', '/entrar', '/cadastro', '/recuperar-senha', '/redefinir-senha', '/auth/', '/blog/preview/']) expect(disallow).toContain(p);
    const blocked = (path: string) => disallow.some((p) => (p!.endsWith('$') ? path === p!.slice(0, -1) : path.startsWith(p!)));
    for (const ok of ['/', '/blog', '/blog/preview', '/apple-icon.png', '/termos-de-uso', '/m/abc']) expect(blocked(ok), ok).toBe(false);
  });
});

describe('RSS (F27)', () => {
  const item = (i: number): BlogListItem => ({
    id: `00000000-0000-4000-8000-00000000000${i}`, slug: `post-${i}`, title: `Título <${i}> & "aspas"`, description: 'Descrição', excerpt: null,
    template: 'leitura', status: 'published', category: { id: '00000000-0000-4000-8000-000000000009', slug: 'c', name: 'Categoria' }, cover: null,
    readingMinutes: 3, publishAt: null, publishedAt: d(`2026-10-0${i}T12:00:00Z`), updatedAt: d('2026-10-05T00:00:00Z'),
  });

  it('is well-formed RSS 2.0 with escaped text, absolute links and RFC 822 dates', () => {
    const xml = buildRss([item(2), item(1)], { origin: ORIGIN, title: 'Blog', description: 'Desc' });
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(xml).toContain('<rss version="2.0"');
    expect(xml).toContain(`<link>${ORIGIN}/blog/post-2</link>`);
    expect(xml).toContain('Título &#60;2&#62; &#38; &#34;aspas&#34;');
    expect(xml).toContain('<pubDate>Fri, 02 Oct 2026 12:00:00 GMT</pubDate>');
    expect(xml).toContain('<lastBuildDate>Fri, 02 Oct 2026 12:00:00 GMT</lastBuildDate>');
    const doc = new DOMParser().parseFromString(xml, 'application/xml');
    expect(doc.getElementsByTagName('parsererror')).toHaveLength(0);
    expect(doc.getElementsByTagName('item')).toHaveLength(2);
  });
});

describe('POST /api/revalidate (F27)', () => {
  const secret = 'x'.repeat(40);
  afterEach(() => {
    vi.unstubAllEnvs();
    revalidateTag.mockClear();
  });
  const call = async (auth: string | undefined, body: unknown = { tags: ['blog', 'sitemap'] }) => {
    const { POST } = await import('@/app/api/revalidate/route');
    return POST(new Request('http://x/api/revalidate', { method: 'POST', headers: auth ? { authorization: auth } : {}, body: JSON.stringify(body) }));
  };

  it('401 without the exact Bearer secret, or when the web has no secret', async () => {
    vi.stubEnv('REVALIDATE_SECRET', secret);
    for (const a of [undefined, 'Bearer nope', secret, `Bearer ${secret}x`]) expect((await call(a)).status).toBe(401);
    vi.stubEnv('REVALIDATE_SECRET', '');
    expect((await call('Bearer ')).status).toBe(401);
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it('validates the body and revalidates each tag', async () => {
    vi.stubEnv('REVALIDATE_SECRET', secret);
    expect((await call(`Bearer ${secret}`, { tags: [] })).status).toBe(422);
    const res = await call(`Bearer ${secret}`);
    expect(res.status).toBe(200);
    expect(revalidateTag.mock.calls.map((c) => c[0])).toEqual(['blog', 'sitemap']);
  });
});
