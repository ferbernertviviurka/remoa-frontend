'use server';

// F27: calls to /v1/admin/blog/*. All exports are async so the editor (T7) and the list can share them. The API re-checks the admin role on every call (rule 9).
import { blogCategoryFixtures, blogListItemFixtures, blogPostFixture, sitemapStatusFixture } from '@remoa/contracts/mocks';
import type { AdminSitemap, BlogAdminList, BlogAdminListQuery, BlogCategory, BlogPost, Result } from '@remoa/contracts';
import { adminGet } from '../shared/api';
import { runAdminAction, type AdminActionOutcome } from '../shared/actions';

// Dev/e2e only (same switch as shared/api.ts).
const mocked = () => process.env.ADMIN_MOCKS === '1' && process.env.NODE_ENV !== 'production';
const ok = <T>(data: T): Result<T> => ({ ok: true, data });

export async function listBlogPosts(query: BlogAdminListQuery = {}): Promise<Result<BlogAdminList>> {
  if (mocked()) {
    const q = (query.q ?? '').toLowerCase();
    const all = blogListItemFixtures.filter((p) => !q || p.title.toLowerCase().includes(q) || p.slug.includes(q));
    const items = all.filter((p) => !query.status || query.status === 'all' || p.status === query.status);
    const count = (s: string) => all.filter((p) => p.status === s).length;
    return ok({ items, total: items.length, page: 1, pageSize: 25, counts: { all: all.length, published: count('published'), scheduled: count('scheduled'), draft: count('draft'), archived: count('archived') } });
  }
  return adminGet<BlogAdminList>('/blog/posts', { q: query.q, status: query.status, page: query.page, pageSize: query.pageSize });
}

export async function getBlogPost(id: string): Promise<Result<BlogPost>> {
  return mocked() ? ok(blogPostFixture) : adminGet<BlogPost>(`/blog/posts/${encodeURIComponent(id)}`);
}

export async function getCategories(): Promise<Result<BlogCategory[]>> {
  return mocked() ? ok(blogCategoryFixtures) : adminGet<BlogCategory[]>('/blog/categories');
}

export async function getSitemapStatus(): Promise<Result<AdminSitemap>> {
  return mocked() ? ok({ status: sitemapStatusFixture, entries: [] }) : adminGet<AdminSitemap>('/blog/sitemap');
}

/** POST /v1/admin/blog<path>. `reason` is only typed for unpublish/delete (D-910); the other actions get a server-chosen audit reason, this default just satisfies runAdminAction. */
export async function blogAction<T = unknown>(path: string, body: { reason?: string } & Record<string, unknown> = {}): Promise<AdminActionOutcome<T>> {
  return runAdminAction<T>(`/blog${path}`, { ...body, reason: body.reason ?? 'ação do admin no blog' });
}
