import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

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
  it('fails in production on [CONFIRMAR] (comments ignored)', () => {
    const r = run({ VERCEL_ENV: 'production' }, 'x [CONFIRMAR]');
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('a.md');
    expect(run({ LEGAL_STRICT: '1' }, 'x [CONFIRMAR]').status).toBe(1);
  });
  it('passes in production when nothing is pending; needs no LEGAL_* variable (D-977)', () => {
    expect(run({ VERCEL_ENV: 'production' }, '<!-- [CONFIRMAR] -->\n# ok').status).toBe(0);
  });
});
