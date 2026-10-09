import { readFileSync } from 'node:fs';
import { defineConfig, devices } from '@playwright/test';

// D-1101 (P-529): e2e contra build de produção (`next build && next start -p $PORT`, PW_NO_SERVER=1) exige os MESMOS valores de build no processo do Playwright:
//  - NEXT_PUBLIC_LAUNCH_PHASE e NEXT_PUBLIC_API_URL iguais aos do build (os specs ramificam por eles; no build ficam embutidos);
//  - REVALIDATE_URL e REVALIDATE_SECRET na API e no web (blog journey: a API revalida o web).
// Por padrão lemos esses quatro de apps/web/.env.local; o que já estiver no ambiente vence. Ver docs/runbooks/performance.md §6.
try {
  for (const l of readFileSync('.env.local', 'utf8').split('\n')) {
    const m = /^(NEXT_PUBLIC_LAUNCH_PHASE|NEXT_PUBLIC_API_URL|REVALIDATE_URL|REVALIDATE_SECRET)=(.*)$/.exec(l.trim());
    if (m && process.env[m[1]!] === undefined) process.env[m[1]!] = m[2]!.replace(/^["']|["']$/g, '');
  }
} catch { /* sem .env.local (CI): usa só o ambiente */ }

const phone = ['**/mobile-review.spec.ts', '**/pwa.spec.ts', '**/map-mobile/*.spec.ts'];

export default defineConfig({
  testDir: 'e2e',
  // Unit files (`*.test.ts`) live next to fixtures under e2e/. Playwright's default also matches them and aborts the run when Vitest's expect loads outside Vitest.
  testMatch: '**/*.spec.ts',
  // 5 workers share one `next dev`: cold route compiles under load made boards/map specs hit the default 30s (flake, not a product bug)
  timeout: 90_000,
  // next dev compiles each route on first hit; the default 5s flakes on a cold server (CI)
  expect: { timeout: 15_000 },
  // PORT=3001 npx playwright test … runs against a private dev server (other sessions may own :3000).
  // D-506: desktop Chromium runs everything except the phone specs; Pixel 5 and iPhone 12 run those (F09). One-line run: --project=pixel-5.
  projects: [
    // baselines keep the pre-D-506 name (`<arg>-<platform>.png`, no project in it): P-210 forbids regenerating them without Fernando's OK
    { name: 'chromium', testIgnore: phone, snapshotPathTemplate: '{snapshotDir}/{testFileDir}/{testFileName}-snapshots/{arg}{-snapshotSuffix}{ext}' },
    { name: 'pixel-5', testMatch: phone, use: { ...devices['Pixel 5'] } },
    { name: 'iphone-12', testMatch: ['**/mobile-review.spec.ts', '**/map-mobile/canvas.spec.ts', '**/map-mobile/menu.spec.ts', '**/map-mobile/selection.spec.ts', '**/map-mobile/criteria.spec.ts'], use: { ...devices['iPhone 12'] } },
  ],
  // D-1076: NEXT_PUBLIC_LAUNCH_PHASE unset = 'open' (features/landing/flags.ts); e2e/landing/page.spec.ts runs the waitlist branch only with NEXT_PUBLIC_LAUNCH_PHASE=waitlist (set it on both build and run).
  // G14 D-606: the challenge tour opens on the first own map (flag in localStorage); specs start with it seen, tour.spec clears it
  use: {
    baseURL: `http://localhost:${process.env.PORT ?? 3000}`,
    storageState: { cookies: [], origins: [{ origin: `http://localhost:${process.env.PORT ?? 3000}`, localStorage: [{ name: 'remoa-challenge-tour', value: '1' }] }] },
  },
  // PW_NO_SERVER=1: the app is already on PORT and this spec does not need a second dev process.
  webServer: process.env.PW_NO_SERVER ? undefined : [
    // API from the sibling backend repo (D-034); needs its .env (`pnpm --silent db:env > .env` there).
    { command: 'pnpm -C ../../../remoa-backend dev', url: 'http://localhost:4000/health', reuseExistingServer: !process.env.CI, env: { STRIPE: 'mock', AI: 'mock' } },
    { command: 'pnpm dev', port: Number(process.env.PORT ?? 3000), reuseExistingServer: !process.env.CI },
  ],
});
