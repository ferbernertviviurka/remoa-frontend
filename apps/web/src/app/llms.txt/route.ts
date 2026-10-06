// /llms.txt (llmstxt.org): what Remoa is, plus links to the public pages and the newest posts. Cached by the `blog`/`feed` tags, like /feed.xml.
import { z } from 'zod';
import { blogListItemSchema, type BlogListItem } from '@remoa/contracts';
import { apiBase } from '@/lib/api/base';
import { buildLlmsTxt } from '@/lib/seo/llms';
import { siteUrl } from '@/lib/seo/site';

async function posts(): Promise<BlogListItem[]> {
  try {
    const res = await fetch(`${apiBase()}/v1/public/blog/feed`, { next: { tags: ['blog', 'feed'], revalidate: 86_400 } });
    if (!res.ok) return [];
    return z.object({ data: z.array(blogListItemSchema) }).parse(await res.json()).data;
  } catch {
    return []; // API down = product summary and static pages only, never a 500
  }
}

export async function GET() {
  return new Response(buildLlmsTxt(await posts(), { origin: siteUrl }), {
    headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=3600' },
  });
}
