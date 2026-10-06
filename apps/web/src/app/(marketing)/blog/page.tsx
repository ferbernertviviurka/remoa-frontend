import type { Metadata } from 'next';
import { t } from '@remoa/strings';
import { getCategories, getPosts } from '@/features/blog/api';
import { listMetadata } from '@/features/blog/seo';
import { IndexView } from '@/features/blog/view';

export const revalidate = 86400; // literal: Next lê o segmento config estaticamente; = BLOG_REVALIDATE

type Props = { searchParams: Promise<{ q?: string; page?: string }> };
const term = (q?: string) => q?.trim().slice(0, 120) || undefined;

// ponytail: reading `searchParams` makes /blog dynamic; the data fetches stay in the tag cache. Split the search to a client island if TTFB matters.
export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { q } = await searchParams;
  return listMetadata({ title: t('blog.pages.index.seoTitle'), description: t('blog.pages.index.seoDescription'), path: '/blog', noindex: !!term(q) });
}

export default async function Page({ searchParams }: Props) {
  const sp = await searchParams;
  const q = term(sp.q);
  const page = q ? Math.max(1, Number.parseInt(sp.page ?? '1', 10) || 1) : 1;
  const [list, categories] = await Promise.all([getPosts({ page, q }), getCategories()]);
  return <IndexView items={list.items} total={list.total} page={list.page} categories={categories} q={q} />;
}
