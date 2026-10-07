import { createBlankBoard } from './create-map';
import { signUpViaForm } from './sign-up';
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('meus mapas: criar, renomear, duplicar e arquivar', async ({ page }) => {
  await signUpViaForm(page, `e2e-boards-${Date.now()}@remoa.test`);
  await expect(page).toHaveURL(/\/app\/hoje$/); // D-321: pós-login cai no Hoje
  await page.goto('/app/mapas');

  await createBlankBoard(page, 'Sepse');

  await page.goto('/app/mapas');
  await expect(page.getByRole('link', { name: 'Sepse' }).first()).toBeVisible();
  await expect(page.getByText('0 cards · 0 conexões')).toBeVisible();

  await page.getByRole('button', { name: 'Mais ações de Sepse' }).click();
  await page.getByRole('menuitem', { name: 'Renomear' }).click();
  await page.getByLabel('Nome do mapa').fill('Sepse grave');
  await page.getByRole('dialog').getByRole('button', { name: 'Renomear' }).click();
  await expect(page.getByRole('link', { name: 'Sepse grave' }).first()).toBeVisible();

  await page.getByRole('button', { name: 'Mais ações de Sepse grave' }).click();
  await page.getByRole('menuitem', { name: 'Duplicar' }).click();
  await expect(page.getByRole('link', { name: 'Sepse grave (cópia)' }).first()).toBeVisible();

  await page.getByRole('button', { name: 'Mais ações de Sepse grave (cópia)' }).click();
  await page.getByRole('menuitem', { name: 'Arquivar' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Arquivar' }).click();
  await expect(page.getByRole('status').getByRole('button', { name: 'Desfazer' })).toBeVisible();
  // the archived tile (newest = the copy) leaves the grid (the rail no longer lists maps, G01 v2); the original stays
  await expect(page.getByRole('link', { name: 'Sepse grave (cópia)' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Abrir Sepse grave', exact: true })).toBeVisible();
});

test('meus mapas: filtrar arquivados, desarquivar e excluir', async ({ page }) => {
  await signUpViaForm(page, `e2e-boards-del-${Date.now()}@remoa.test`);
  await createBlankBoard(page, 'Choque');
  await page.goto('/app/mapas');

  await page.getByRole('button', { name: 'Mais ações de Choque' }).click();
  await page.getByRole('menuitem', { name: 'Arquivar' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Arquivar' }).click();
  await expect(page.getByRole('link', { name: 'Abrir Choque' })).toHaveCount(0);

  await page.getByRole('radio', { name: 'Arquivados' }).click();
  await expect(page.getByRole('link', { name: 'Abrir Choque' })).toBeVisible();
  await page.getByRole('button', { name: 'Mais ações de Choque' }).click();
  await page.getByRole('menuitem', { name: 'Desarquivar' }).click();
  await expect(page.getByRole('link', { name: 'Abrir Choque' })).toHaveCount(0);

  await page.getByRole('radio', { name: 'Ativos' }).click();
  await page.getByRole('button', { name: 'Mais ações de Choque' }).click();
  await page.getByRole('menuitem', { name: 'Excluir' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('button', { name: 'Excluir' })).toBeDisabled();
  await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished.catch(() => null)))); // axe mid-fade of the overlay/dialog reads blended colours (contrast 3.95 flake)
  const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).exclude('nextjs-portal').analyze();
  expect(axe.violations).toEqual([]);
  await dialog.getByLabel('Para confirmar, digite o nome do mapa').fill('Choque');
  await dialog.getByRole('button', { name: 'Excluir' }).click();
  await expect(page.getByText('Mapa excluído', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Abrir Choque' })).toHaveCount(0);
  await page.getByRole('radio', { name: 'Todos' }).click();
  await expect(page.getByRole('link', { name: 'Abrir Choque' })).toHaveCount(0);
});
