/** Same-origin relative path or '/mapas'. Parses like the browser does, so `/\evil.com` or `/\t/evil.com` can't escape. */
export function safeNext(next?: string | null): string {
  return next?.startsWith('/') && new URL(next, 'http://x.invalid').host === 'x.invalid' ? next : '/mapas';
}
