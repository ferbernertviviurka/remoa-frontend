import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const FULL = Object.fromEntries(['COMPANY_NAME', 'CNPJ', 'ADDRESS', 'DPO_NAME', 'DPO_EMAIL', 'FORO_CITY', 'UPDATED_AT', 'TERMS_VERSION', 'PRIVACY_VERSION'].map((k) => [`LEGAL_${k}`, 'x']));
const dirWith = (md: string) => {
  const d = mkdtempSync(join(tmpdir(), 'legal-'));
  writeFileSync(join(d, 'a.md'), md);
  return d;
};
const run = (env: Record<string, string>, md = '# ok') =>
  spawnSync('node', [join(__dirname, 'legal-check.mjs')], { env: { PATH: process.env.PATH ?? '', LEGAL_CONTENT_DIR: dirWith(md), ...env }, encoding: 'utf8' });

describe('legal-check', () => {
  it('passes outside production even with pending items', () => {
    expect(run({}, 'x [CONFIRMAR]').status).toBe(0);
    expect(run({ VERCEL_ENV: 'preview' }, 'x [CONFIRMAR]').status).toBe(0);
  });
  it('fails in production on [CONFIRMAR] (comments ignored) and on empty variables', () => {
    const r = run({ VERCEL_ENV: 'production', ...FULL }, 'x [CONFIRMAR]');
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('a.md');
    expect(run({ LEGAL_STRICT: '1', ...FULL, LEGAL_CNPJ: ' ' }).stderr).toContain('LEGAL_CNPJ');
  });
  it('passes in production when everything is filled', () => {
    expect(run({ VERCEL_ENV: 'production', ...FULL }, '<!-- [CONFIRMAR] -->\n# ok').status).toBe(0);
  });
});
