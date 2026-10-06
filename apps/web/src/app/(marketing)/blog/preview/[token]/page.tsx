import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getPreview } from '@/features/blog/api';
import { postMetadata } from '@/features/blog/seo';
import { PostView } from '@/features/blog/view';

// Private, 24 h link: never cached, never indexed.
export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ token: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = await getPreview((await params).token);
  return post ? postMetadata({ ...post, preview: true }) : {}; // P-415: the 404 (blog/not-found) already carries the only noindex
}

export default async function Page({ params }: Props) {
  const post = await getPreview((await params).token);
  if (!post) notFound();
  return <PostView post={{ ...post, preview: true }} />;
}
