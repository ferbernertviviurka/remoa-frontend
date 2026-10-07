import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { withStrings } from '@remoa/strings';
import * as more from '@remoa/strings/ns';
import { getPublicSeed } from '@/features/library/public-api';
import { PublicSeedPage } from '@/features/library/public-seeds';
import { siteUrl } from '@/lib/seo/site';

const t = withStrings({ mapLibrary: more.mapLibrary });
export const revalidate = 3600; // literal: Next reads segment config statically
export const generateStaticParams = () => [];

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const seed = await getPublicSeed(slug);
  return seed
    ? { title: seed.title, description: t('mapLibrary.detailSeoDescription', { title: seed.title }), alternates: { canonical: `${siteUrl}/mapas-prontos/${slug}` } }
    : {};
}

export default async function Page({ params }: Props) {
  const seed = await getPublicSeed((await params).slug);
  if (!seed) notFound();
  return <PublicSeedPage seed={seed} />;
}
