// G14 ponto 6: "Entrar na lista" used to do nothing when clicked before the lazy island hydrated.
import { expect, test } from '@playwright/test';

test('waitlist submit shows success right after load (no waiting for the island)', async ({ page }) => {
  await page.goto('/#cta');
  const email = page.getByRole('textbox', { name: /e-?mail/i }).last();
  await email.waitFor();
  await expect(async () => {
    await page.getByRole('textbox', { name: /e-?mail/i }).last().fill(`g14-${Date.now()}@teste.com`);
    await page.getByRole('button', { name: 'Entrar na lista' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Você está na lista' })).toBeVisible({ timeout: 4000 });
  }).toPass({ timeout: 30_000 });
});
