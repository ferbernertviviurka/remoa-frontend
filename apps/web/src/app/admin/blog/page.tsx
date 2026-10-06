import { blogStatuses } from '@remoa/contracts';
import { requireAdmin } from '@/features/admin/shared/api';
import { flat, pageNumber, unwrap, type ListSearch } from '@/features/admin/list-kit/server';
import { getCategories, getSitemapStatus, listBlogPosts } from '@/features/admin/blog/api';
import { BlogListView } from '@/features/admin/blog/list/blog-list-view';

export default async function Page({ searchParams }: { searchParams: Promise<ListSearch> }) {
  await requireAdmin();
  const params = flat(await searchParams);
  const status = (blogStatuses as readonly string[]).includes(params.status ?? '') ? (params.status as (typeof blogStatuses)[number]) : 'all';
  const page = pageNumber(params.page);
  const [list, sitemap, categories] = await Promise.all([listBlogPosts({ q: params.q, status, page }), getSitemapStatus(), getCategories()]);
  const { data, error } = unwrap(list);
  return <BlogListView data={data} error={error} sitemap={sitemap.ok ? sitemap.data : null} sitemapError={!sitemap.ok} categories={categories.ok ? categories.data : null} status={status} page={page} />;
}
