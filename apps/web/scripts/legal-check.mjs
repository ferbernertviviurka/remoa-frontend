// F27 FR-43 (D-953, D-977): production deploy gate. With VERCEL_ENV=production (or LEGAL_STRICT=1) it fails (exit 1) while a published
// content/legal/*.md still has [CONFIRMAR]. Preview and dev builds pass. Company data lives in src/features/legal/config.ts, not in .env.
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = process.env.LEGAL_CONTENT_DIR ?? join(dirname(fileURLToPath(import.meta.url)), '..', 'content', 'legal');

if (process.env.VERCEL_ENV !== 'production' && process.env.LEGAL_STRICT !== '1') process.exit(0);

const problems = readdirSync(dir)
  .filter((f) => f.endsWith('.md'))
  .map((f) => [f, (readFileSync(join(dir, f), 'utf8').replace(/<!--[\s\S]*?-->/g, '').match(/\[CONFIRMAR\]/g) ?? []).length])
  .filter(([, n]) => n > 0)
  .map(([f, n]) => `${f} ainda tem ${n} [CONFIRMAR]`);
if (problems.length) {
  console.error(`legal-check: o deploy de produção não pode sair assim.\n- ${problems.join('\n- ')}`);
  process.exit(1);
}
