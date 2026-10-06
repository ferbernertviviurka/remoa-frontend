import { describe, expect, it } from 'vitest';
import { LEGAL_CONFIG } from './config';

describe('LEGAL_CONFIG', () => {
  it('versions use the format the API accepts; the date is AAAA-MM-DD; every value is filled', () => {
    expect(LEGAL_CONFIG.termsVersion).toMatch(/^[A-Za-z0-9._-]{1,32}$/);
    expect(LEGAL_CONFIG.privacyVersion).toMatch(/^[A-Za-z0-9._-]{1,32}$/);
    expect(LEGAL_CONFIG.vars.dataAtualizacao).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    for (const [k, v] of Object.entries(LEGAL_CONFIG.vars)) expect(v.trim(), k).not.toBe('');
  });
});
