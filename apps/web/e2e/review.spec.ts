import { expect, test } from '@playwright/test';

test('revisar hoje: conceitos novos aparecem na fila e nada vence ainda', async ({ page }) => {
  await page.goto('/cadastro');
  await page.getByLabel('E-mail').fill(`e2e-review-${Date.now()}@remoa.test`);
  await page.getByLabel('Senha').fill('senha-forte-123');
  await page.getByRole('button', { name: 'Criar conta' }).click();
  await expect(page).toHaveURL(/\/mapas$/);
  await page.getByRole('button', { name: 'Criar mapa em branco' }).click();
  await page.getByLabel('Nome do mapa').fill('Sepse');
  await page.getByRole('button', { name: 'Criar mapa', exact: true }).click();
  await expect(page).toHaveURL(/\/mapas\/[0-9a-f-]{36}$/);
  await expect(page.locator('.react-flow__pane')).toBeVisible();

  for (const title of ['Sepse', 'Choque séptico']) {
    await page.getByRole('button', { name: 'Adicionar Card' }).click();
    const form = page.getByRole('complementary', { name: 'Detalhes do card' }).getByRole('form');
    await form.getByLabel('Título').fill(title);
    await form.getByRole('button', { name: 'Salvar' }).click();
    await expect(form).toHaveCount(0);
  }

  await page.goto('/revisar');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Nada vence hoje');
  await expect(page.getByRole('list', { name: 'Fila por mapa' })).toContainText('2 Novos');
  await expect(page.getByText('vencem hoje', { exact: false }).filter({ hasText: /^[1-9]/ })).toHaveCount(0);
});
