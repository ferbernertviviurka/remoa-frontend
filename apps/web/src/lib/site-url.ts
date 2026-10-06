/** Public origin of the app for links that leave it (confirmation e-mail, reset, OAuth). NEXT_PUBLIC_SITE_URL wins; `fallback` is the request origin. Never hard-code localhost. */
export const siteUrl = (fallback: string): string => (process.env.NEXT_PUBLIC_SITE_URL || fallback).replace(/\/+$/, '');
