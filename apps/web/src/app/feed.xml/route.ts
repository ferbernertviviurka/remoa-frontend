// F27: RSS 2.0 of the 20 newest indexable posts. Cached by the `feed` tag (revalidated by the API on publish/unpublish).
import { z } from 'zod';
import { blogListItemSchema, type BlogListItem } from '@remoa/contracts';
import { t } from '@remoa/strings';
import { apiBase } from '@/lib/api/base';
import { buildRss } from '@/lib/seo/rss';
import { siteUrl } from '@/lib/seo/site';

async function feedItems(): Promise<BlogListItem[]> {
  try {
    const res = await fetch(`${apiBase()}/v1/public/blog/feed`, { next: { tags: ['blog', 'feed'], revalidate: 86_400 } });
    if (!res.ok) return [];
    return z.object({ data: z.array(blogListItemSchema) }).parse(await res.json()).data.slice(0, 20);
  } catch {
    return []; // API down = valid empty channel, never a 500
  }
}

export async function GET() {
  const xml = buildRss(await feedItems(), { origin: siteUrl, title: t('blog.pages.index.seoTitle'), description: t('blog.pages.index.seoDescription') });
  return new Response(xml, { headers: { 'content-type': 'application/rss+xml; charset=utf-8', 'cache-control': 'public, max-age=300' } });
}
