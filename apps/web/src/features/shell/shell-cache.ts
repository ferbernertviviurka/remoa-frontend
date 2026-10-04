/** Cache name shared with public/sw.js. Bump it when the precache contents change. */
export const SHELL_CACHE = 'remoa-shell-v6';
/** PWA start_url. A logged-out visit redirects, so install stores the offline page under this path. */
export const START_PATH = '/app/hoje';
export const OFFLINE_DOCUMENT = '/offline.html';

/** The public offline page is safe to store as the start URL. A redirect is not. */
export function shouldPrecacheOffline(response: { ok: boolean; redirected: boolean }): boolean {
  return response.ok && !response.redirected;
}

/** Only a successful response for the same path is the app shell. A login redirect must not be stored as /app/revisar. */
export function shouldCacheShell(requestPath: string, response: { ok: boolean; redirected: boolean; url: string }): boolean {
  if (!response.ok || response.redirected) return false;
  try {
    return new URL(response.url).pathname === requestPath;
  } catch {
    return false;
  }
}
