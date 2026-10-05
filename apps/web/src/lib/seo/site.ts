// Q-015 (domain) is still open: `https://remoa.app` is a placeholder; set NEXT_PUBLIC_SITE_URL once decided.
// `new URL()` (metadataBase) throws on a bare domain and fails the whole build, so a missing scheme becomes https.
export const normalizeSiteUrl = (raw: string | undefined): string => {
  const v = raw?.trim().replace(/\/+$/, '');
  if (!v) return 'https://remoa.app';
  return /^https?:\/\//i.test(v) ? v : `https://${v}`;
};

export const siteUrl = normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);
