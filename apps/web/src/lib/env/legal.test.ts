import { describe, expect, it } from 'vitest';
import { googleSiteVerification, legalEnv, revalidateSecret } from './legal';

describe('legalEnv', () => {
  it('maps the template variables and lists what is missing', () => {
    const e = legalEnv({ LEGAL_COMPANY_NAME: 'Empresa X', LEGAL_DPO_EMAIL: ' contato@remoa.com.br ', LEGAL_TERMS_VERSION: '2026-10-01' });
    expect(e.vars.razaoSocial).toBe('Empresa X');
    expect(e.vars.dpoEmail).toBe('contato@remoa.com.br');
    expect(e.termsVersion).toBe('2026-10-01');
    expect(e.missing).toEqual(['LEGAL_CNPJ', 'LEGAL_ADDRESS', 'LEGAL_DPO_NAME', 'LEGAL_FORO_CITY', 'LEGAL_UPDATED_AT', 'LEGAL_PRIVACY_VERSION']);
  });
  it('secrets: revalidate needs 32+ chars; verification is optional', () => {
    expect(revalidateSecret({ REVALIDATE_SECRET: 'short' })).toBeUndefined();
    expect(revalidateSecret({ REVALIDATE_SECRET: 'x'.repeat(32) })).toBe('x'.repeat(32));
    expect(googleSiteVerification({})).toBeUndefined();
    expect(googleSiteVerification({ GOOGLE_SITE_VERIFICATION: 'abc' })).toBe('abc');
  });
});
