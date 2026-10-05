import { createBlankBoard } from './create-map';
import { signUpViaForm } from './sign-up';
import { expect, test } from '@playwright/test';

test('suspender um card o tira do Revisar hoje; retomar o devolve; reiniciar pede confirmação', async ({ page }) => {
  await signUpViaForm(page, `e2e-study-${Date.now()}@remoa.test`);
  await page.goto('/app/mapas');
  await createBlankBoard(page, 'Sepse');
  await expect(page.locator('.react-flow__pane')).toBeVisible();
  const panel = page.getByRole('complementary', { name: 'Painel do mapa' });
  for (const title of ['Sepse', 'Choque séptico']) {
    await page.getByRole('toolbar', { name: 'Ferramentas do mapa' }).getByRole('button', { name: 'Adicionar Pergunta e Resposta' }).click();
    const form = panel.getByRole('form');
    await form.getByLabel('Título').fill(title);
    await form.getByRole('button', { name: 'Salvar' }).click();
    await expect(form).toHaveCount(0);
  }
  const queue = page.getByRole('list', { name: 'Fila por mapa' });
  await page.goto('/app/revisar');
  await expect(queue).toContainText('2 Novos');
  await page.goBack();
  await expect(page.locator('.react-flow__pane')).toBeVisible();

  await page.getByRole('button', { name: 'Selecionar Sepse' }).first().click();
  await panel.getByRole('button', { name: 'Mais ações de Sepse' }).click();
  await page.getByRole('menuitem', { name: 'Suspender' }).click();
  await expect(panel.getByText('Suspenso: fora do Revisar hoje')).toBeVisible();
  await page.goto('/app/revisar');
  await expect(queue).toContainText('1 Novo');
  await expect(queue).not.toContainText('2 Novos');

  await page.goBack();
  await page.getByRole('button', { name: 'Selecionar Sepse' }).first().click();
  await panel.getByRole('button', { name: 'Mais ações de Sepse' }).click();
  await page.getByRole('menuitem', { name: 'Retomar' }).click();
  await expect(panel.getByText('Suspenso: fora do Revisar hoje')).toHaveCount(0);
  await panel.getByRole('button', { name: 'Mais ações de Sepse' }).click();
  await page.getByRole('menuitem', { name: 'Reiniciar progresso' }).click();
  const dialog = page.getByRole('dialog', { name: 'Reiniciar o progresso deste card?' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Cancelar' }).click();
  await page.goto('/app/revisar');
  await expect(queue).toContainText('2 Novos');
});
