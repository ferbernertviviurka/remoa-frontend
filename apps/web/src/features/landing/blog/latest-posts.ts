import { z } from 'zod';
import { blogListItemSchema, type BlogListItem } from '@remoa/contracts';
import { t } from '@remoa/strings';
import { apiBase } from '@/lib/api/base';

// Server-only by use (called from the server LandingPage); no `server-only` package in the repo.
const bodySchema = z.object({ data: z.array(blogListItemSchema) });

/** FR-39: the last `n` published posts. Any failure = empty list, and the section disappears (FR-40). Revalidated on demand via tags (FR-41). */
export async function getLatestPosts(n = 5): Promise<BlogListItem[]> {
  try {
    const res = await fetch(`${apiBase()}/v1/public/blog/posts/latest?n=${n}`, { next: { tags: ['blog', 'landing'] } });
    if (!res.ok) return [];
    return bodySchema.parse(await res.json()).data.slice(0, n);
  } catch {
    return [];
  }
}

const dateFmt = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'America/Sao_Paulo' });
/** "2 out 2026" (the mock's format; Intl alone gives "2 de out. de 2026"). */
export const shortDate = (iso: Date) => {
  const p = Object.fromEntries(dateFmt.formatToParts(iso).map((x) => [x.type, x.value]));
  return `${p.day} ${String(p.month).replace('.', '')} ${p.year}`;
};

/** BlogListItem → PostCard props of LandingBlogSection. ponytail: a post without cover gets the app icon; publishing probably requires a cover, so this is a safety net. */
export const toLandingPost = (p: BlogListItem) => {
  const when = p.publishedAt ?? p.updatedAt;
  return {
    href: `/blog/${p.slug}`,
    cover: p.cover
      ? { src: p.cover.url, alt: p.cover.alt, width: p.cover.width, height: p.cover.height, srcSet: p.cover.srcset.webp, sizes: '(min-width: 1024px) 560px, 100vw' }
      : { src: '/icon.svg', alt: '', width: 1200, height: 630 },
    category: p.category?.name ?? t('blog.navigation.blog'),
    title: p.title,
    description: p.excerpt ?? p.description,
    date: shortDate(when),
    dateTime: when.toISOString(),
    readingTime: t('blog.components.postCard.readingTime', { n: p.readingMinutes }),
  };
};
