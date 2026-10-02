import { expect, test } from '@playwright/test';
import { formReady } from './sign-up';

const email = `e2e-${Date.now()}@remoa.test`;
const password = 'senha-forte-123';

test('rota protegida redireciona para /entrar', async ({ page }) => {
  await page.goto('/mapas');
  await expect(page).toHaveURL(/\/entrar\?next=%2Fmapas$/);
});

test('cadastro, logout e login', async ({ page }) => {
  await page.goto('/cadastro');
  await formReady(page);
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha').fill('curta');
  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(page.getByText('Use 8 ou mais caracteres')).toBeVisible(); // fica no passo 1
  await page.getByLabel('Senha').fill(password);
  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(page.locator('[aria-current="step"]')).toContainText('Sobre você');
  await page.getByRole('button', { name: 'Voltar' }).click();
  await expect(page.getByLabel('E-mail')).toHaveValue(email); // voltar não perde o digitado
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.getByRole('button', { name: 'Criar conta' }).click();
  await expect(page.getByText('Marque a caixa')).toBeVisible();
  await page.getByRole('checkbox').click();
  await page.getByRole('button', { name: 'Criar conta' }).click();
  await expect(page).toHaveURL(/\/$/); // D-086: pós-login cai no Hoje
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Seu primeiro mapa começa aqui');
  const events = await page.evaluate(() => window.__remoaEvents ?? []);
  expect(events.map((e) => e.event)).toContain('signup');

  await page.goto('/conta');
  await expect(page.getByRole('region', { name: 'Resumo do perfil' }).getByText(email, { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Sair' }).click();
  await expect(page).toHaveURL(/\/$/);

  await page.goto('/entrar');
  await formReady(page);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByText('Informe um e-mail válido')).toBeVisible(); // validação por campo
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha').fill(password);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).toHaveURL(/\/$/); // D-086: pós-login cai no Hoje
});
