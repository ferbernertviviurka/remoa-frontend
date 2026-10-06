import { z } from 'zod';
import { blogListItemSchema, type BlogListItem } from '@remoa/contracts';
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
