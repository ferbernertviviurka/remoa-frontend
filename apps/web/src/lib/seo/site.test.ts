import { describe, expect, it } from 'vitest';
import { normalizeSiteUrl } from './site';

describe('normalizeSiteUrl', () => {
  it('keeps a full URL and drops the trailing slash', () => {
    expect(normalizeSiteUrl('https://remoa.com.br')).toBe('https://remoa.com.br');
    expect(normalizeSiteUrl('https://remoa.com.br/')).toBe('https://remoa.com.br');
    expect(normalizeSiteUrl('http://localhost:3000')).toBe('http://localhost:3000');
  });

  it('adds https to a bare domain, so new URL() (metadataBase) does not fail the build', () => {
    expect(normalizeSiteUrl('remoa.com.br')).toBe('https://remoa.com.br');
    expect(() => new URL(normalizeSiteUrl(' remoa.com.br '))).not.toThrow();
  });

  it('falls back to the local origin outside production and fails in production (D-915)', () => {
    expect(normalizeSiteUrl(undefined, false)).toBe('http://localhost:3000');
    expect(normalizeSiteUrl('  ', false)).toBe('http://localhost:3000');
    expect(() => normalizeSiteUrl(undefined, true)).toThrow(/NEXT_PUBLIC_SITE_URL/);
  });
});
