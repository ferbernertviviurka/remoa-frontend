import { expect, test } from '@playwright/test';

test('home responde', async ({ page }) => {
  const res = await page.goto('/');
  expect(res?.ok()).toBe(true);
});
