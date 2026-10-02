// Capture tool for the side-by-side review (G03). SECTIONS=seguranca,plano SHOTS_OUT=<dir> pnpm exec playwright test e2e/account/zz-shots.spec.ts
import { test } from '@playwright/test';
import { accountUser, sections } from './fixture';

test.use({ viewport: { width: 1440, height: 900 }, colorScheme: 'light' });
test('shots', async ({ page, request }) => {
  test.setTimeout(180_000);
  const out = process.env.SHOTS_OUT ?? '/tmp';
  const only = process.env.SECTIONS?.split(',') ?? [...sections];
  await accountUser(page, request, 'Admin');
  for (const s of only) {
    await page.goto(`/conta/${s}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${out}/app-${s}-full.png`, fullPage: true, animations: 'disabled' });
  }
});
