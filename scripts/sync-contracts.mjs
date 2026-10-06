// D-699: @remoa/contracts is owned by remoa-backend; this repo keeps a byte-for-byte copy of its source in packages/contracts/src
// so the web builds without the backend checkout (Vercel clones only this repo).
//   pnpm contracts:sync   copy ../remoa-backend/packages/contracts/src here (tests excluded), removing files that no longer exist
//   pnpm contracts:check  exit 1 if the copy differs from the backend (CI runs it with both repos checked out)
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = join(root, '..', 'remoa-backend', 'packages', 'contracts', 'src');
const target = join(root, 'packages', 'contracts', 'src');
const check = process.argv.includes('--check');

const isSynced = (path) => !/\.test\.tsx?$/.test(path);
const list = (dir) =>
  existsSync(dir)
    ? readdirSync(dir, { recursive: true })
        .map(String)
        .filter((p) => statSync(join(dir, p)).isFile() && isSynced(p))
        .sort()
    : [];

if (!existsSync(source)) {
  process.stderr.write(`contracts: ${relative(root, source)} not found; check out remoa-backend next to remoa-frontend\n`);
  process.exit(1);
}

const from = list(source);
const to = list(target);

if (check) {
  const missing = from.filter((p) => !to.includes(p));
  const extra = to.filter((p) => !from.includes(p));
  const changed = from.filter((p) => to.includes(p) && !readFileSync(join(source, p)).equals(readFileSync(join(target, p))));
  const drift = [...missing.map((p) => `missing  ${p}`), ...extra.map((p) => `extra    ${p}`), ...changed.map((p) => `changed  ${p}`)];
  if (drift.length) {
    process.stderr.write(`contracts: packages/contracts/src is out of date with remoa-backend. Run \`pnpm contracts:sync\`.\n${drift.join('\n')}\n`);
    process.exit(1);
  }
  process.stdout.write(`contracts: in sync (${from.length} files)\n`);
} else {
  for (const p of to.filter((p) => !from.includes(p))) rmSync(join(target, p));
  for (const p of from) {
    mkdirSync(dirname(join(target, p)), { recursive: true });
    cpSync(join(source, p), join(target, p));
  }
  // D-1018: exports/sideEffects of the copy's package.json follow the backend's (subpaths such as ./medical-schools).
  const backendPkg = JSON.parse(readFileSync(join(root, '..', 'remoa-backend', 'packages', 'contracts', 'package.json'), 'utf8'));
  const copyPath = join(root, 'packages', 'contracts', 'package.json');
  const copyPkg = JSON.parse(readFileSync(copyPath, 'utf8'));
  copyPkg.exports = backendPkg.exports;
  copyPkg.sideEffects = backendPkg.sideEffects;
  writeFileSync(copyPath, `${JSON.stringify(copyPkg, null, 2)}\n`);
  process.stdout.write(`contracts: synced ${from.length} files from remoa-backend\n`);
}
