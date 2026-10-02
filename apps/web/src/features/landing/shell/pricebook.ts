import { apiBase } from '@/lib/api';
import { publicPriceBookSchema, type PublicPriceBook } from '@remoa/contracts';

export const pricebookPath = (variant: '29' | '49' | null) => `/v1/public/pricebook${variant ? `?v=${variant}` : ''}`;

/** Server-side, cached 1 h (FR-1). null on any failure: the plans section renders its "unavailable" state. */
export async function loadPublicPriceBook(variant: '29' | '49' | null): Promise<PublicPriceBook | null> {
  try {
    const res = await fetch(`${apiBase()}${pricebookPath(variant)}`, { next: { revalidate: 3600 } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = (await res.json()) as { ok?: boolean; data?: unknown };
    return publicPriceBookSchema.parse(body.data);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('landing: pricebook unavailable', e instanceof Error ? e.message : e); // ponytail: no @remoa/log in the web app yet
    return null;
  }
}
