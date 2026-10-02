import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  // 5 workers share one `next dev`: cold route compiles under load made boards/map specs hit the default 30s (flake, not a product bug)
  timeout: 90_000,
  // next dev compiles each route on first hit; the default 5s flakes on a cold server (CI)
  expect: { timeout: 15_000 },
  // PORT=3001 npx playwright test … runs against a private dev server (other sessions may own :3000).
  use: { baseURL: `http://localhost:${process.env.PORT ?? 3000}` },
  webServer: [
    // API from the sibling backend repo (D-034); needs its .env (`pnpm --silent db:env > .env` there).
    { command: 'pnpm -C ../../../remoa-backend dev', url: 'http://localhost:4000/health', reuseExistingServer: !process.env.CI, env: { STRIPE: 'mock' } },
    { command: 'pnpm dev', port: Number(process.env.PORT ?? 3000), reuseExistingServer: !process.env.CI },
  ],
});
