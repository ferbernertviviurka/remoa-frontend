// Server-only by use (no `server-only` package in the repo, see landing/blog/latest-posts.ts).
import { z } from 'zod';
import {
  blogCategorySchema, blogListItemSchema, blogPublicListSchema, blogPublicPostSchema, blogSlugResponseSchema,
  type BlogCategory, type BlogListItem, type BlogPublicList, type BlogPublicPost,
} from '@remoa/contracts';
import { apiBase } from '@/lib/api/base';

/** Revalidated on demand by the API (D-908 tags); the long `revalidate` is only the safety net. */
export const BLOG_REVALIDATE = 86_400;
export const BLOG_PAGE_SIZE = 12;

export type PostResult = { kind: 'post'; post: BlogPublicPost } | { kind: 'redirect'; to: string };

/** null on 404 or any failure (logged); callers render the empty/404 state, never throw (FR-15). */
async function get<T>(path: string, schema: z.ZodType<T, z.ZodTypeDef, unknown>, init: RequestInit & { next?: { tags?: string[]; revalidate?: number } }): Promise<T | null> {
  try {
    const res = await fetch(`${apiBase()}/v1/public/blog/${path}`, init);
    if (!res.ok) return null;
    const body = (await res.json()) as { data?: unknown };
    return schema.parse(body.data);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('blog: API unavailable', path, e instanceof Error ? e.message : e); // ponytail: no @remoa/log in the web app yet
    return null;
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
