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
  return {
    metadataBase: new URL(siteUrl),
    title,
    description,
    alternates: { canonical: '/' },
    ...(v || h ? { robots: { index: false, follow: false } } : {}),
    // No `images` here (P-172): Next injects og:image from `(marketing)/opengraph-image.tsx` with its hashed URL
    // (`/opengraph-image-<hash>`); a hand-written `/opengraph-image` 404s. Twitter falls back to og:image.
    openGraph: { type: 'website', locale: 'pt_BR', url: '/', siteName: t('landing.seo.orgName'), title: ogTitle, description: ogDescription },
    twitter: { card: 'summary_large_image', title: ogTitle, description: ogDescription },
  };
}
