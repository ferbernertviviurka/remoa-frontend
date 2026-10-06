// F27 FR-43 (D-953): production deploy gate. With VERCEL_ENV=production (or LEGAL_STRICT=1) it fails (exit 1) while a published
// content/legal/*.md still has [CONFIRMAR] or any LEGAL_* variable is empty. Preview and dev builds pass. Keep KEYS in sync with lib/env/legal.ts.
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const KEYS = ['LEGAL_COMPANY_NAME', 'LEGAL_CNPJ', 'LEGAL_ADDRESS', 'LEGAL_DPO_NAME', 'LEGAL_DPO_EMAIL', 'LEGAL_FORO_CITY', 'LEGAL_UPDATED_AT', 'LEGAL_TERMS_VERSION', 'LEGAL_PRIVACY_VERSION'];
const dir = process.env.LEGAL_CONTENT_DIR ?? join(dirname(fileURLToPath(import.meta.url)), '..', 'content', 'legal');

if (process.env.VERCEL_ENV !== 'production' && process.env.LEGAL_STRICT !== '1') process.exit(0);

const problems = [
  ...KEYS.filter((k) => !process.env[k]?.trim()).map((k) => `${k} está vazio`),
  ...readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => [f, (readFileSync(join(dir, f), 'utf8').replace(/<!--[\s\S]*?-->/g, '').match(/\[CONFIRMAR\]/g) ?? []).length])
    .filter(([, n]) => n > 0)
    .map(([f, n]) => `${f} ainda tem ${n} [CONFIRMAR]`),
];
if (problems.length) {
  console.error(`legal-check: o deploy de produção não pode sair assim.\n- ${problems.join('\n- ')}`);
  process.exit(1);
}
