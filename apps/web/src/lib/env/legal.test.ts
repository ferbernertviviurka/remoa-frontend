import { describe, expect, it } from 'vitest';
import { googleSiteVerification, revalidateSecret } from './legal';

describe('legal settings', () => {
  it('secrets: revalidate needs 32+ chars; verification is optional', () => {
    expect(revalidateSecret({ REVALIDATE_SECRET: 'short' })).toBeUndefined();
    expect(revalidateSecret({ REVALIDATE_SECRET: 'x'.repeat(32) })).toBe('x'.repeat(32));
    expect(googleSiteVerification({})).toBeUndefined();
    expect(googleSiteVerification({ GOOGLE_SITE_VERIFICATION: 'abc' })).toBe('abc');
  });
});
