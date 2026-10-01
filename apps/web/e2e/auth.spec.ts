import { expect, test } from '@playwright/test';

const email = `e2e-${Date.now()}@remoa.test`;
const password = 'senha-forte-123';

test('rota protegida redireciona para /entrar', async ({ page }) => {
  await page.goto('/mapas');
  await expect(page).toHaveURL(/\/entrar\?next=%2Fmapas$/);
});

test('cadastro, logout e login', async ({ page }) => {
  await page.goto('/cadastro');
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha').fill(password);
  await page.getByRole('button', { name: 'Criar conta' }).click();
  await expect(page).toHaveURL(/\/mapas$/);
  await expect(page.getByRole('heading', { name: 'Você ainda não tem mapas' })).toBeVisible();
  const events = await page.evaluate(() => window.__remoaEvents ?? []);
  expect(events.map((e) => e.event)).toContain('signup');

  await page.goto('/conta');
  await expect(page.getByText(email)).toBeVisible();
  await page.getByRole('button', { name: 'Sair' }).click();
  await expect(page).toHaveURL(/\/$/);

  await page.goto('/entrar');
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha').fill(password);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).toHaveURL(/\/mapas$/);
});
