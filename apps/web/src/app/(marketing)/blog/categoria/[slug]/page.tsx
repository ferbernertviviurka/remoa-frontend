import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { BLOG_REVALIDATE, getCategory, getPosts } from '@/features/blog/api';
import { categoryMetadata } from '@/features/blog/seo';
import { CategoryView } from '@/features/blog/view';

export const revalidate = BLOG_REVALIDATE;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const c = await getCategory((await params).slug);
  return c ? categoryMetadata(c) : {};
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  const category = await getCategory(slug);
  if (!category) notFound();
  const list = await getPosts({ category: slug });
  return <CategoryView category={category} items={list.items} />;
}
