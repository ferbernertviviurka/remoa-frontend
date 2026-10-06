// G19 / F27 (D-914): the one module that reads the blog server settings of the web. No NEXT_PUBLIC_ here: import it only
// from server code (in a client bundle every value is undefined). Company data for the legal pages is in features/legal/config.ts (D-977).

type Source = Record<string, string | undefined>;

/** Bearer of POST /api/revalidate (same value as the API's REVALIDATE_SECRET); undefined = endpoint refuses everything. */
export const revalidateSecret = (source: Source = process.env): string | undefined => {
  const v = source.REVALIDATE_SECRET?.trim();
  return v && v.length >= 32 ? v : undefined;
};

/** Optional Search Console token for <meta name="google-site-verification">. */
export const googleSiteVerification = (source: Source = process.env): string | undefined => source.GOOGLE_SITE_VERIFICATION?.trim() || undefined;
