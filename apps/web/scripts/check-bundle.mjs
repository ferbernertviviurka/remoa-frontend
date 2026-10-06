// G21 FR-55 (P-483): bundle budget per route. Reads the `next build` output (First Load JS, gzip, as Next prints it) and fails when a route
// is above its ceiling in perf-budgets.json. Usage:
//   pnpm --filter @remoa/web build 2>&1 | tee build.log; node apps/web/scripts/check-bundle.mjs build.log
//   node scripts/check-bundle.mjs build.log --update   rewrites the ceilings = ceil(current * (1 + headroom)); do it only when a PR improves or accepts a size on purpose.
// `target` is the F26 goal (not met yet, informational: printed, never fails); `routes` is the ceiling that fails the CI.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const BUDGETS = join(import.meta.dirname, '..', 'perf-budgets.json');
const KB = { B: 1 / 1000, kB: 1, MB: 1000 };

/** `┌ ○ /blog   5.2 kB   109 kB` -> { '/blog': 109 }, plus `shared` from "First Load JS shared by all". */
export function parseBuild(text) {
  const routes = {};
  let shared = null;
  for (const line of text.split('\n')) {
    const r = /^\s*[┌├└]\s+\S+\s+(\/\S*)\s+([\d.]+)\s*(B|kB|MB)\s+([\d.]+)\s*(B|kB|MB)(?:\s+\S+\s+\S+)?\s*$/.exec(line); // optional Revalidate/Expire columns of ISR routes
    if (r) routes[r[1]] = Math.round(Number(r[4]) * KB[r[5]]);
    const s = /First Load JS shared by all\s+([\d.]+)\s*(B|kB|MB)/.exec(line);
    if (s) shared = Math.round(Number(s[1]) * KB[s[2]]);
  }
  return { routes, shared };
}

/** Pure: returns the failing routes ({ route, kb, ceiling }) and the routes without a ceiling. */
export function compare(routes, budgets) {
  const over = [];
  const unlisted = [];
  for (const [route, kb] of Object.entries(routes)) {
    const ceiling = budgets.routes[route];
    if (ceiling === undefined) {
      unlisted.push(route);
      if (kb > budgets.fallbackKb) over.push({ route, kb, ceiling: budgets.fallbackKb });
    } else if (kb > ceiling) over.push({ route, kb, ceiling });
  }
  return { over, unlisted };
}

function main() {
  const [file, flag] = process.argv.slice(2);
  if (!file) throw new Error('usage: check-bundle.mjs <build.log> [--update]');
  const { routes, shared } = parseBuild(readFileSync(file, 'utf8'));
  if (!Object.keys(routes).length) throw new Error('no routes found in the build output (is it the `next build` table?)');
  const budgets = JSON.parse(readFileSync(BUDGETS, 'utf8'));
  if (flag === '--update') {
    const up = (kb) => Math.ceil(kb * (1 + budgets.headroom));
    budgets.shared = up(shared ?? budgets.shared);
    budgets.routes = Object.fromEntries(Object.entries(routes).sort(([a], [b]) => a.localeCompare(b)).map(([r, kb]) => [r, up(kb)]));
    budgets.fallbackKb = Math.max(...Object.values(budgets.routes));
    writeFileSync(BUDGETS, `${JSON.stringify(budgets, null, 2)}\n`);
    process.stdout.write(`updated ${Object.keys(budgets.routes).length} ceilings in perf-budgets.json\n`);
    return;
  }
  const { over, unlisted } = compare(routes, budgets);
  if (shared !== null && shared > budgets.shared) over.push({ route: '(shared by all)', kb: shared, ceiling: budgets.shared });
  const goal = (r) => (r.startsWith('/app/') || r.startsWith('/admin') ? budgets.target.authenticatedKb : budgets.target.publicKb);
  const aboveGoal = Object.entries(routes).filter(([r, kb]) => kb > goal(r)).length;
  process.stdout.write(`bundle: ${Object.keys(routes).length} routes, ${aboveGoal} above the F26 goal (info), ${unlisted.length} without a ceiling\n`);
  for (const r of unlisted) process.stdout.write(`  no ceiling for ${r}: run --update when the size is accepted\n`);
  if (over.length) {
    for (const o of over) process.stderr.write(`  OVER ${o.route}: ${o.kb} kB > ${o.ceiling} kB\n`);
    process.exit(1);
  }
}

if (process.argv[1] === import.meta.filename) main();
