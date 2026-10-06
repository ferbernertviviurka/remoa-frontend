// F16 (D-536): landing baselines (toHaveScreenshot), full page at 1440 and 390, light, reduced motion (hero on its final frame).
// Darwin only. Update only on purpose, and with Fernando's OK (P-210): `pnpm test:e2e e2e/landing/visual --update-snapshots`.
import { expect, test } from '@playwright/test';
import { gotoLanding } from './ready';

test.skip(process.platform !== 'darwin', 'baselines só em darwin');
test.use({ colorScheme: 'light', reducedMotion: 'reduce' });

for (const [name, width, height] of [['1440', 1440, 900], ['390', 390, 844]] as const) {
  test(`landing ${name}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await gotoLanding(page, '/');
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => document.fonts.ready);
    await page.mouse.move(2, 2);
    // lazy images below the fold: scroll through once so the full-page shot has them
    await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); } scrollTo(0, 0); });
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot(`landing-${name}.png`, { fullPage: true, animations: 'disabled', mask: [page.locator('nextjs-portal')], stylePath: 'e2e/landing/hide-blog.css', maxDiffPixelRatio: 0.02 });
  });
}
