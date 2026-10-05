/** Where a signed-in user lands by default (D-321). */
export const APP_HOME = '/app/hoje';

/** Same-origin relative path or `APP_HOME`. Parses like the browser does, so `/\evil.com` or `/\t/evil.com` can't escape. */
export function safeNext(next?: string | null): string {
  return next?.startsWith('/') && new URL(next, 'http://x.invalid').host === 'x.invalid' ? next : APP_HOME;
}
