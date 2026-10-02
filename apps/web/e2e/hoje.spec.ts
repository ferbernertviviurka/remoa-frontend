import { expect, test } from '@playwright/test';
import { createSepseBoard, signUpAndLogin } from './visual/fixture';

test.use({ viewport: { width: 1440, height: 900 } });

test('hoje: trilho, estado vazio honesto e mapa recente', async ({ page, request }) => {
  test.setTimeout(120_000);
  const { headers } = await signUpAndLogin(page, request);
  await page.goto('/');
  await expect(page).toHaveURL(/\/$/);
  const rail = page.getByRole('navigation', { name: 'Principal' });
  await expect(rail.getByRole('link', { name: 'Hoje', exact: true })).toHaveAttribute('aria-current', 'page');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Seu primeiro mapa começa aqui');
  await expect(page.getByText('Crie o seu primeiro mapa.')).toBeVisible();

  await createSepseBoard(request, headers);
  await page.goto('/');
  await expect(page.getByRole('link', { name: 'Abrir o mapa Sepse' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Nada vence hoje');
  if (process.env.HOJE_SHOT) await page.screenshot({ path: process.env.HOJE_SHOT });
  await rail.getByRole('link', { name: 'Mapas', exact: true }).click();
  await expect(page).toHaveURL(/\/mapas$/);
});

test('landing pública para deslogado', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('link', { name: 'Entrar' })).toBeVisible();
});
