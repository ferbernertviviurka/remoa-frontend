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

  it('falls back to the placeholder domain when unset or blank', () => {
    expect(normalizeSiteUrl(undefined)).toBe('https://remoa.app');
    expect(normalizeSiteUrl('  ')).toBe('https://remoa.app');
  });
});
