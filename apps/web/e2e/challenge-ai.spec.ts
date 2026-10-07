import { createBlankBoard } from './create-map';
import { signUpViaForm } from './sign-up';
import { expect, test, type Page } from '@playwright/test';

const ANSWER = 'Resposta secreta que não pode aparecer';

const form = (page: Page) => page.getByRole('complementary', { name: 'Painel do mapa' }).getByRole('form');

test('desafio com IA a partir do card: a resposta do mapa não aparece antes nem depois do Não sei', async ({ page }) => {
  test.setTimeout(180_000);
  await signUpViaForm(page, `e2e-challenge-ai-${Date.now()}@remoa.test`);
  await page.goto('/app/mapas');
  await createBlankBoard(page, 'Mapa sintético');
  await expect(page.locator('.react-flow__pane')).toBeVisible();

  await page.getByRole('toolbar', { name: 'Ferramentas do mapa' }).getByRole('button', { name: 'Adicionar Pergunta e Resposta' }).click();
  await form(page).getByLabel('Título').fill('Conceito sintético');
  await form(page).getByLabel('Resposta', { exact: true }).fill(ANSWER);
  await form(page).getByRole('button', { name: 'Salvar' }).click();
  await expect(form(page)).toHaveCount(0);

  const panel = page.getByRole('complementary', { name: 'Painel do mapa' });
  if ((await panel.getByRole('button', { name: 'Desafiar' }).count()) === 0) {
    await page.getByRole('button', { name: 'Selecionar Conceito sintético' }).click();
  }
  await panel.getByRole('button', { name: 'Desafiar' }).click();

  const setup = page.getByRole('dialog', { name: 'Desafiar este mapa' });
  await setup.getByRole('button', { name: /IA responde/ }).click();
  await expect(setup.getByText('Este card')).toBeVisible();
  await setup.getByRole('radio', { name: 'Perguntas do mapa, a IA corrige' }).click();
  await setup.getByRole('radio', { name: '1', exact: true }).click();
  await expect(setup.getByRole('status')).toContainText('1');
  await setup.getByRole('button', { name: 'Começar desafio' }).click();

  await expect(page).toHaveURL(/\/desafio-ia\?session=/);
  await expect(page.getByText('Conceito sintético')).toBeVisible();
  await expect(page.locator('body')).not.toContainText(ANSWER);

  await page.getByRole('button', { name: 'Não sei' }).click();
  await expect(page.getByText('Incorreta')).toBeVisible();
  await expect(page.locator('body')).not.toContainText(ANSWER);
  await expect(page.getByRole('button', { name: /Acertei|Errei/ })).toHaveCount(0);
});
