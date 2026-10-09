// Server-only by use (no `server-only` package in the repo, see landing/blog/latest-posts.ts).
import { z } from 'zod';
import {
  blogCategorySchema, blogListItemSchema, blogPublicListSchema, blogPublicPostSchema, blogSlugResponseSchema,
  type BlogCategory, type BlogListItem, type BlogPublicList, type BlogPublicPost,
} from '@remoa/contracts';
import { apiBase, publicFetchTimeout } from '@/lib/api/base';
import { noStore } from '@/lib/cache';

/** Revalidated on demand by the API (D-908 tags); the long `revalidate` is only the safety net. */
export const BLOG_REVALIDATE = 86_400;
export const BLOG_PAGE_SIZE = 12;

export type PostResult = { kind: 'post'; post: BlogPublicPost } | { kind: 'redirect'; to: string };

/**
 * null only when the API answered 404 (cacheable, FR-15). Network, timeout, 5xx or an invalid body THROW: Next keeps the last good
 * ISR page and never stores the failure (D-968); with no previous version the error boundary shows, not a cached 404.
 * During `next build` the same failure returns null and calls `noStore`, so a hung API cannot fail the deploy (D-1677).
 */
async function get<T>(path: string, schema: z.ZodType<T, z.ZodTypeDef, unknown>, init: RequestInit & { next?: { tags?: string[]; revalidate?: number } }): Promise<T | null> {
  try {
    const timeout = publicFetchTimeout();
    const signal = init.signal ? AbortSignal.any([init.signal, timeout]) : timeout;
    const res = await fetch(`${apiBase()}/v1/public/blog/${path}`, { ...init, signal });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`blog: API ${res.status} on ${path}`);
    return schema.parse(((await res.json()) as { data?: unknown }).data);
  } catch (error) {
    // A hung API during `next build` must not spend the static-page budget (D-1677). Outside the build the throw stays, so ISR keeps the last good page (D-968).
    if (process.env.NEXT_PHASE === 'phase-production-build') {
      noStore();
      return null;
    }
    throw error;
  }
}

const cached = (...tags: string[]) => ({ next: { tags: ['blog', ...tags], revalidate: BLOG_REVALIDATE } });
const EMPTY: BlogPublicList = { items: [], total: 0, page: 1, pageSize: BLOG_PAGE_SIZE };

export async function getPosts(q: { page?: number; category?: string; q?: string } = {}): Promise<BlogPublicList> {
  const sp = new URLSearchParams();
  if (q.page && q.page > 1) sp.set('page', String(q.page));
  if (q.category) sp.set('category', q.category);
  if (q.q) sp.set('q', q.q);
  const qs = sp.size ? `?${sp}` : '';
  // searches are unbounded input: no cache entry per query, only the tag-less short one
  const init = q.q ? { next: { revalidate: 60 } } : cached(...(q.category ? [`blog:category:${q.category}`] : []));
  return (await get(`posts${qs}`, blogPublicListSchema, init)) ?? EMPTY;
}

export const getLatestPosts = async (n: number): Promise<BlogListItem[]> =>
  (await get(`posts/latest?n=${n}`, z.array(blogListItemSchema), cached())) ?? [];

export const getCategories = async (): Promise<BlogCategory[]> =>
  (await get('categories', z.array(blogCategorySchema), cached())) ?? [];

export const getCategory = (slug: string) =>
  get(`categories/${encodeURIComponent(slug)}`, blogCategorySchema, cached(`blog:category:${slug}`));

export const getPost = (slug: string): Promise<PostResult | null> =>
  get(`posts/${encodeURIComponent(slug)}`, blogSlugResponseSchema, cached(`blog:post:${slug}`)).then((r) =>
    !r ? null : r.kind === 'redirect' ? r : { kind: 'post', post: r.post });

/** Preview is private and short-lived: never cached. */
export const getPreview = (token: string) =>
  get(`preview/${encodeURIComponent(token)}`, blogPublicPostSchema, { cache: 'no-store' });
