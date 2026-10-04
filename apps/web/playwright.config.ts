import { defineConfig, devices } from '@playwright/test';

const phone = ['**/mobile-review.spec.ts', '**/pwa.spec.ts'];

export default defineConfig({
  testDir: 'e2e',
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
    { name: 'iphone-12', testMatch: ['**/mobile-review.spec.ts'], use: { ...devices['iPhone 12'] } },
  ],
  use: { baseURL: `http://localhost:${process.env.PORT ?? 3000}` },
  // PW_NO_SERVER=1: the app is already on PORT and this spec does not need a second dev process.
  webServer: process.env.PW_NO_SERVER ? undefined : [
    // API from the sibling backend repo (D-034); needs its .env (`pnpm --silent db:env > .env` there).
    { command: 'pnpm -C ../../../remoa-backend dev', url: 'http://localhost:4000/health', reuseExistingServer: !process.env.CI, env: { STRIPE: 'mock' } },
    { command: 'pnpm dev', port: Number(process.env.PORT ?? 3000), reuseExistingServer: !process.env.CI },
  ],
});
