import { test } from '@playwright/test';
import { accountUser } from './fixture';

test.use({ viewport: { width: 1440, height: 900 }, colorScheme: 'light' });
test('dialogs', async ({ page, request }) => {
  test.setTimeout(120_000);
  const out = process.env.SHOTS_OUT ?? '/tmp';
  await accountUser(page, request, 'Admin');
  await page.goto('/conta/perfil');
  await page.getByRole('button', { name: 'Adicionar foto' }).click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${out}/app-foto.png`, animations: 'disabled' });
  await page.keyboard.press('Escape');
  await page.goto('/conta/dados');
  await page.getByRole('button', { name: 'Excluir conta' }).click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${out}/app-excluir.png`, animations: 'disabled' });
});
