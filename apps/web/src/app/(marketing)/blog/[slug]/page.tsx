import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { BLOG_REVALIDATE, getPost } from '@/features/blog/api';
import { postMetadata } from '@/features/blog/seo';
import { PostView } from '@/features/blog/view';

export const revalidate = BLOG_REVALIDATE;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const r = await getPost((await params).slug);
  return r?.kind === 'post' ? postMetadata(r.post) : {};
}

export default async function Page({ params }: Props) {
  const r = await getPost((await params).slug);
  if (!r) notFound();
  if (r.kind === 'redirect') permanentRedirect(r.to); // FR-12: old slug, 308
  return <PostView post={r.post} />;
}
