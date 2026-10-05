import { describe, expect, it, vi } from 'vitest';

// landing.seo.* strings are owned by T0; stub t() so these tests do not depend on landing order.
vi.mock('@remoa/strings', () => ({ t: (k: string) => (k === 'landing.seo.title' ? 'T'.repeat(55) : k === 'landing.seo.description' ? 'D'.repeat(150) : k) }));

import { landingMetadata } from './landing';
import { faqPageLd, organizationLd, serializeLd, softwareApplicationLd, webSiteLd } from './json-ld';
import * as og from '../../app/(marketing)/opengraph-image';

describe('landingMetadata', () => {
  it('is indexable with canonical root, and noindex for variants', () => {
    const m = landingMetadata({});
    expect(m.alternates?.canonical).toBe('/');
    expect(m.robots).toBeUndefined();
    expect(String(m.title).length).toBeLessThanOrEqual(60);
    expect(String(m.description).length).toBeLessThanOrEqual(155);
    expect(landingMetadata({ v: 'b' }).robots).toEqual({ index: false, follow: false });
    expect(landingMetadata({ h: 'c' }).robots).toEqual({ index: false, follow: false });
    // P-172: the OG image comes from the opengraph-image file convention (hashed URL), never a hand-written path
    expect(m.openGraph).not.toHaveProperty('images');
  });
});

describe('json-ld', () => {
  it('Organization has name and url', () => {
    expect(organizationLd()).toMatchObject({ '@type': 'Organization', name: expect.any(String), url: expect.any(String) });
  });
  it('WebSite has name, url and pt-BR', () => {
    expect(webSiteLd()).toMatchObject({ '@type': 'WebSite', name: expect.any(String), url: expect.any(String), inLanguage: 'pt-BR' });
  });
  it('SoftwareApplication has required fields and two offers', () => {
    const d = softwareApplicationLd('29.90') as { offers: { price: string; priceCurrency: string }[] };
    expect(d).toMatchObject({ '@type': 'SoftwareApplication', name: expect.any(String), applicationCategory: expect.any(String), operatingSystem: 'Web' });
    expect(d.offers.map((o) => o.price)).toEqual(['0', '29.90']);
    expect(d.offers.every((o) => o.priceCurrency === 'BRL')).toBe(true);
    expect((softwareApplicationLd() as { offers: { price: string }[] }).offers.map((o) => o.price)).toEqual(['0']);
  });
  it('FAQPage mirrors the given items', () => {
    const d = faqPageLd([{ q: 'Q1', a: 'A1' }]) as { mainEntity: unknown[] };
    expect(d.mainEntity).toEqual([{ '@type': 'Question', name: 'Q1', acceptedAnswer: { '@type': 'Answer', text: 'A1' } }]);
  });
  it('escapes </script', () => {
    expect(serializeLd({ a: '</script><b>' })).not.toContain('</script');
  });
});

describe('opengraph-image', () => {
  it('exports 1200x630 png', () => {
    expect(og.size).toEqual({ width: 1200, height: 630 });
    expect(og.contentType).toBe('image/png');
  });
});
