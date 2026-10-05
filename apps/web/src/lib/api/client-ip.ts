import { headers } from 'next/headers';

/**
 * D-537: server-side calls made on behalf of a browser tell the API who the browser is. The API trusts `x-remoa-client-ip`
 * only with `x-remoa-proxy-secret` = PROXY_SHARED_SECRET (server-only, never NEXT_PUBLIC_); a plain x-forwarded-for is ignored.
 * The IP is the first x-forwarded-for entry: on Vercel the platform overwrites that header with the real client IP (and
 * `next dev` sets it from the socket). Self-hosted behind your own proxy, make the proxy overwrite it.
 */
export async function clientIpHeaders(): Promise<Record<string, string>> {
  const secret = process.env.PROXY_SHARED_SECRET;
  if (!secret) return {};
  try {
    const h = await headers();
    const ip = (h.get('x-forwarded-for')?.split(',')[0] ?? h.get('x-real-ip'))?.trim();
    return ip ? { 'x-remoa-client-ip': ip, 'x-remoa-proxy-secret': secret } : {};
  } catch {
    return {}; // outside a request (tests, build)
  }
}
