/** Own module so public pages (the landing) can reach the API without pulling `@remoa/contracts` + zod into their bundle (D-535). */
export const apiBase = () => process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

/**
 * A public fetch that never answers used to sit until Next's static-page budget and the build died
 * with "Failed to build /sitemap.xml". Eight seconds still fits a cold API and leaves the prerender
 * time to fall back to the static pages (D-1677).
 */
export const PUBLIC_FETCH_TIMEOUT_MS = 8_000;
export const publicFetchTimeout = () => AbortSignal.timeout(PUBLIC_FETCH_TIMEOUT_MS);
