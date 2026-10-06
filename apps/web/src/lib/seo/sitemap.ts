import type { MetadataRoute } from 'next';
import { SITEMAP_STATIC_PATHS, type SitemapEntry } from '@remoa/contracts';
import { siteUrl } from './site';

// F27 FR-31/32 (D-916): static public pages + the blog entries of the API. No priority/changefreq (ignored by Google).
const LEGAL = new Set<string>(['/termos-de-uso', '/politica-de-privacidade']);
/** Defense in depth: only blog paths come from the API (never /app, /admin, preview…). */
const BLOG_PATH = /^\/blog\/(categoria\/)?[a-z0-9]+(-[a-z0-9]+)*$/;

const iso = (d: string | undefined) => {
  const t = d ? Date.parse(d) : NaN;
  return Number.isNaN(t) ? undefined : new Date(t).toISOString();
};

/** lastmod: newest blog entry for '/' and '/blog', LEGAL_UPDATED_AT for the legal pages, the API's own for blog URLs. */
export function buildSitemap(entries: SitemapEntry[], { origin = siteUrl, legalUpdatedAt = process.env.LEGAL_UPDATED_AT } = {}): MetadataRoute.Sitemap {
  const blog = entries.filter((e) => (e.kind === 'post' || e.kind === 'category') && BLOG_PATH.test(e.path));
  const newest = blog.reduce<Date | undefined>((m, e) => (!m || e.lastmod > m ? e.lastmod : m), undefined)?.toISOString();
  const legal = iso(legalUpdatedAt);
  return [
    ...SITEMAP_STATIC_PATHS.map((path) => {
      const lastModified = LEGAL.has(path) ? legal : newest;
      return { url: path === '/' ? origin : `${origin}${path}`, ...(lastModified ? { lastModified } : {}) };
    }),
    ...blog.map((e) => ({ url: `${origin}${e.path}`, lastModified: e.lastmod.toISOString() })),
  ];
}
