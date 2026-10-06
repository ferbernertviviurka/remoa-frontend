import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { t } from '@remoa/strings';
import { getCategories, getPosts } from '@/features/blog/api';
import { listMetadata } from '@/features/blog/seo';
import { IndexView, totalPages } from '@/features/blog/view';

export const revalidate = 86400; // literal: Next lê o segmento config estaticamente; = BLOG_REVALIDATE
// P-410: empty list = each path rendered on its first visit and cached (ISR, dropped by the `blog` tags), not on every request.
export const generateStaticParams = () => [];

type Props = { params: Promise<{ n: string }> };

/** "2" yes; "0", "-1", "1.5", "abc", "02" no. Page 1 is /blog (308). */
const parse = (raw: string) => (/^[1-9]\d{0,3}$/.test(raw) ? Number(raw) : null);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const n = parse((await params).n) ?? 1;
  return listMetadata({ title: t('blog.pages.index.pageSeoTitle', { n }), description: t('blog.pages.index.seoDescription'), path: `/blog/pagina/${n}` });
}

export default async function Page({ params }: Props) {
  const n = parse((await params).n);
  if (n === null) notFound();
  if (n === 1) permanentRedirect('/blog');
  const [list, categories] = await Promise.all([getPosts({ page: n }), getCategories()]);
  if (n > totalPages(list.total) || list.items.length === 0) notFound();
  return <IndexView items={list.items} total={list.total} page={n} categories={categories} />;
}
