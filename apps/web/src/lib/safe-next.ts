/** Where a signed-in user lands by default (D-321). */
export const APP_HOME = '/app/hoje';

/** Where a freshly signed-up user lands (the onboarding asks who they are). */
export const ONBOARDING_HOME = '/app/onboarding';

/** Same-origin relative path or `APP_HOME`. Parses like the browser does, so `/\evil.com` or `/\t/evil.com` can't escape. */
export function safeNext(next?: string | null): string {
  return next?.startsWith('/') && new URL(next, 'http://x.invalid').host === 'x.invalid' ? next : APP_HOME;
}
