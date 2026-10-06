// The public origin comes only from NEXT_PUBLIC_SITE_URL (D-915): no domain in code. Unset on the Vercel production build
// (VERCEL_ENV=production) fails the build; anywhere else it is the local dev origin.
// `new URL()` (metadataBase) throws on a bare domain and fails the whole build, so a missing scheme becomes https.
export const DEV_SITE_URL = 'http://localhost:3000';

export const normalizeSiteUrl = (raw: string | undefined, production = process.env.VERCEL_ENV === 'production'): string => {
  const v = raw?.trim().replace(/\/+$/, '');
  if (!v) {
    if (production) throw new Error('NEXT_PUBLIC_SITE_URL is required in production');
    return DEV_SITE_URL;
  }
  return /^https?:\/\//i.test(v) ? v : `https://${v}`;
};

export const siteUrl = normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);
