import { t } from '@remoa/strings/full';
import { siteUrl } from './site';

type Ld = Record<string, unknown>;

/** `<` escaped so a string containing `</script` cannot close the tag. */
export const serializeLd = (data: Ld) =>
  JSON.stringify(data).replace(/</g, '\\u003c');

export function JsonLd({ data }: { data: Ld }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeLd(data) }} />;
}

export const organizationLd = (): Ld => ({
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: t('landing.seo.orgName'),
  url: siteUrl,
  logo: `${siteUrl}/icon.svg`,
});

/** G11: names the site for Google's site-name display; no SearchAction until there is on-site search (PRD v2). */
export const webSiteLd = (): Ld => ({
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: t('landing.seo.orgName'),
  url: siteUrl,
  inLanguage: 'pt-BR',
});

/**
 * `proPrice`: monthly Pro price in BRL as a decimal string (e.g. "29.90"), from the PriceBook. Without it (API down) the
 * app is still described with the Free offer only (G11), never with a guessed price.
 */
export const softwareApplicationLd = (proPrice?: string): Ld => ({
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: t('landing.seo.orgName'),
  applicationCategory: t('landing.seo.appCategory'),
  operatingSystem: 'Web',
  url: siteUrl,
  description: t('landing.seo.description'),
  inLanguage: 'pt-BR',
  offers: [
    { '@type': 'Offer', name: 'Free', price: '0', priceCurrency: 'BRL' },
    ...(proPrice ? [{ '@type': 'Offer', name: 'Pro', price: proPrice, priceCurrency: 'BRL' }] : []),
  ],
});

/** Pass the exact strings rendered in the accordion (FR-13): same source, same text. */
export const faqPageLd = (items: readonly { q: string; a: string }[]): Ld => ({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: items.map(({ q, a }) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
});
