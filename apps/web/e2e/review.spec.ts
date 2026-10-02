import { createBlankBoard } from './create-map';
import { expect, test } from '@playwright/test';

test('revisar hoje: conceitos novos aparecem na fila e nada vence ainda', async ({ page }) => {
  await page.goto('/cadastro');
  await page.getByLabel('E-mail').fill(`e2e-review-${Date.now()}@remoa.test`);
  await page.getByLabel('Senha').fill('senha-forte-123');
  await page.getByRole('button', { name: 'Criar conta' }).click();
  await expect(page).toHaveURL(/\/$/); // D-086: pós-login cai no Hoje
  await page.goto('/mapas');
  await createBlankBoard(page, 'Sepse');
  await expect(page.locator('.react-flow__pane')).toBeVisible();

  for (const title of ['Sepse', 'Choque séptico']) {
    await page.getByRole('toolbar', { name: 'Ferramentas do mapa' }).getByRole('button', { name: 'Adicionar card de conceito' }).click();
    const form = page.getByRole('complementary', { name: 'Painel do mapa' }).getByRole('form');
    await form.getByLabel('Título').fill(title);
    await form.getByRole('button', { name: 'Salvar' }).click();
    await expect(form).toHaveCount(0);
  }

  await page.goto('/revisar');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Nada vence hoje');
  await expect(page.getByRole('list', { name: 'Fila por mapa' })).toContainText('2 Novos');
  await expect(page.getByText('vencem hoje', { exact: false }).filter({ hasText: /^[1-9]/ })).toHaveCount(0);

  // G01 T6: the daily session runs inside the map of its first item
  await page.getByRole('button', { name: 'Começar revisão' }).click();
  await expect(page).toHaveURL(/\/mapas\/[^?]+\?modo=desafio&sessao=diaria$/);
  await expect(page.getByRole('complementary', { name: 'Painel do mapa' }).getByRole('progressbar', { name: 'Progresso da sessão' })).toBeVisible();
  await page.goto('/revisar/sessao'); // v1 route
  await expect(page).toHaveURL(/\/revisar$/);
});
