import type { Metadata } from 'next';
import { t } from '@remoa/strings';
import { siteUrl } from './site';

type Params = { v?: string | string[]; h?: string | string[] };

/** FR-1/FR-16: canonical is always the root; A/B variants (`?v=`, `?h=`) are noindex so they never split ranking. */
export function landingMetadata({ v, h }: Params = {}): Metadata {
  const title = t('landing.seo.title');
  const description = t('landing.seo.description');
  const ogTitle = t('landing.seo.ogTitle');
  const ogDescription = t('landing.seo.ogDescription');
  const image = { url: '/opengraph-image', width: 1200, height: 630, alt: ogTitle };
  return {
    metadataBase: new URL(siteUrl),
    title,
    description,
    alternates: { canonical: '/' },
    ...(v || h ? { robots: { index: false, follow: false } } : {}),
    openGraph: { type: 'website', locale: 'pt_BR', url: '/', siteName: t('landing.seo.orgName'), title: ogTitle, description: ogDescription, images: [image] },
    twitter: { card: 'summary_large_image', title: ogTitle, description: ogDescription, images: [image.url] },
  };
}
