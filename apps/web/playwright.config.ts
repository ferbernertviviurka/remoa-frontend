import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  // next dev compiles each route on first hit; the default 5s flakes on a cold server (CI)
  expect: { timeout: 15_000 },
  use: { baseURL: 'http://localhost:3000' },
  webServer: [
    // API from the sibling backend repo (D-034); needs its .env (`pnpm --silent db:env > .env` there).
    { command: 'pnpm -C ../../../remoa-backend dev', url: 'http://localhost:4000/health', reuseExistingServer: !process.env.CI },
    { command: 'pnpm dev', port: 3000, reuseExistingServer: !process.env.CI },
  ],
});
