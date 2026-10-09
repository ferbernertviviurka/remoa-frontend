import { apiBase, publicFetchTimeout } from '@/lib/api/base';
import { noStore } from '@/lib/cache';
import { publicPriceBookSchema, type PublicPriceBook } from '@remoa/contracts';

/** `lifetime` optional here: an API older than D-375 must not take the whole plans section down (the Founder card just hides). */
const landingPriceBookSchema = publicPriceBookSchema.partial({ lifetime: true });
export type LandingPriceBook = Omit<PublicPriceBook, 'lifetime'> & Partial<Pick<PublicPriceBook, 'lifetime'>>;

export const pricebookPath = (variant: '29' | '49' | null) => `/v1/public/pricebook${variant ? `?v=${variant}` : ''}`;

/** Server-side, cached 1 h (FR-1). null on any failure: the plans section renders its "unavailable" state, never cached (an API outage must not stick for an hour). */
export async function loadPublicPriceBook(variant: '29' | '49' | null): Promise<LandingPriceBook | null> {
  try {
    const res = await fetch(`${apiBase()}${pricebookPath(variant)}`, { signal: publicFetchTimeout(), next: { revalidate: 3600 } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = (await res.json()) as { ok?: boolean; data?: unknown };
    return landingPriceBookSchema.parse(body.data);
  } catch (e) {
    noStore();
    // eslint-disable-next-line no-console
    console.error('landing: pricebook unavailable', e instanceof Error ? e.message : e); // ponytail: no @remoa/log in the web app yet
    return null;
  }
}
