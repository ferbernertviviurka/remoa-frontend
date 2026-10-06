import type { BlogListItem } from '@remoa/contracts';

const esc = (s: string) => s.replace(/[<>&'"]/g, (c) => `&#${c.charCodeAt(0)};`);
// XML 1.0 forbids most control characters even escaped.
const clean = (s: string) => esc(s.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, ''));

/** RSS 2.0 (+ atom:link self). Dates in RFC 822, links absolute from `origin`. */
export function buildRss(items: BlogListItem[], { origin, title, description }: { origin: string; title: string; description: string }) {
  const newest = items.map((p) => p.publishedAt ?? p.updatedAt).sort((a, b) => b.getTime() - a.getTime())[0];
  const item = (p: BlogListItem) => {
    const link = `${origin}/blog/${p.slug}`;
    return [
      '<item>',
      `<title>${clean(p.title)}</title>`,
      `<link>${clean(link)}</link>`,
      `<guid isPermaLink="true">${clean(link)}</guid>`,
      `<pubDate>${(p.publishedAt ?? p.updatedAt).toUTCString()}</pubDate>`,
      `<description>${clean(p.excerpt || p.description)}</description>`,
      p.category ? `<category>${clean(p.category.name)}</category>` : '',
      '</item>',
    ].join('');
  };
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel>',
    `<title>${clean(title)}</title>`,
    `<link>${clean(`${origin}/blog`)}</link>`,
    `<description>${clean(description)}</description>`,
    '<language>pt-BR</language>',
    `<atom:link href="${clean(`${origin}/feed.xml`)}" rel="self" type="application/rss+xml"/>`,
    newest ? `<lastBuildDate>${newest.toUTCString()}</lastBuildDate>` : '',
    ...items.map(item),
    '</channel></rss>',
    '',
  ].join('\n');
}
