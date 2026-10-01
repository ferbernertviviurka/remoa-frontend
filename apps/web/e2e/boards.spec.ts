import { expect, test } from '@playwright/test';

test('meus mapas: criar, renomear, duplicar e arquivar', async ({ page }) => {
  await page.goto('/cadastro');
  await page.getByLabel('E-mail').fill(`e2e-boards-${Date.now()}@remoa.test`);
  await page.getByLabel('Senha').fill('senha-forte-123');
  await page.getByRole('button', { name: 'Criar conta' }).click();
  await expect(page).toHaveURL(/\/mapas$/);

  await page.getByRole('button', { name: 'Criar mapa em branco' }).click();
  await page.getByLabel('Nome do mapa').fill('Sepse');
  await page.getByRole('button', { name: 'Criar mapa', exact: true }).click();
  await expect(page).toHaveURL(/\/mapas\/[^/]+$/);

  await page.goto('/mapas');
  await expect(page.getByRole('link', { name: 'Sepse' }).first()).toBeVisible();
  await expect(page.getByText('0 cards · 0 conexões')).toBeVisible();
  const sidebar = page.getByRole('list', { name: 'Seus mapas' });
  await expect(sidebar.getByRole('link', { name: /Sepse/ })).toContainText('0');

  await page.getByRole('button', { name: 'Renomear' }).click();
  await page.getByLabel('Nome do mapa').fill('Sepse grave');
  await page.getByRole('dialog').getByRole('button', { name: 'Renomear' }).click();
  await expect(page.getByRole('link', { name: 'Sepse grave' }).first()).toBeVisible();

  await page.getByRole('button', { name: 'Duplicar' }).click();
  await expect(page.getByRole('link', { name: 'Sepse grave (cópia)' }).first()).toBeVisible();

  await page.getByRole('button', { name: 'Arquivar' }).first().click();
  await page.getByRole('dialog').getByRole('button', { name: 'Arquivar' }).click();
  await expect(page.getByRole('status').getByRole('button', { name: 'Desfazer' })).toBeVisible();
  // the archived tile (newest = the copy) leaves the grid and the sidebar; the original stays
  await expect(page.getByRole('link', { name: 'Sepse grave (cópia)' })).toHaveCount(0);
  await expect(sidebar.getByRole('link', { name: /\(cópia\)/ })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Sepse grave', exact: true })).toBeVisible();
  await expect(sidebar.getByRole('link', { name: /Sepse grave/ })).toBeVisible();
});
