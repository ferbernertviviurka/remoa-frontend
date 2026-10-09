import { noStore } from '@/lib/cache';
import { z } from 'zod';
import { blogListItemSchema, type BlogListItem } from '@remoa/contracts';
import { apiBase, publicFetchTimeout } from '@/lib/api/base';

// Server-only by use (called from the server LandingPage); no `server-only` package in the repo.
const bodySchema = z.object({ data: z.array(blogListItemSchema) });

/** FR-39: the last `n` published posts. Empty list = section disappears (FR-40). Failure = same, but noStore keeps that render out of the ISR cache so the section comes back on the next one (D-968). Revalidated on demand via tags (FR-41). */
export async function getLatestPosts(n = 5): Promise<BlogListItem[]> {
  try {
    const res = await fetch(`${apiBase()}/v1/public/blog/posts/latest?n=${n}`, { signal: publicFetchTimeout(), next: { tags: ['blog', 'landing'] } });
    if (!res.ok) throw new Error(String(res.status));
    return bodySchema.parse(await res.json()).data.slice(0, n);
  } catch {
    noStore();
    return [];
  }
}
