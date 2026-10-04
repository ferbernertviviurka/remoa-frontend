import { expect, type Page } from '@playwright/test';

/** D-535: below-the-fold sections hydrate after load (lazy islands); interact only once they are live. */
export async function gotoLanding(page: Page, url: string) {
  await page.goto(url);
  await expect(page.locator('[data-island="pending"]')).toHaveCount(0);
}
