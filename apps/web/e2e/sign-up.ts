import type { Page } from '@playwright/test';

/** The auth forms set `data-ready` once hydrated; text typed before that is wiped by the controlled inputs (G08). */
export const formReady = (page: Page) => page.locator('form[data-ready]').waitFor();

/** Cadastro pelo formulário em 3 passos (G08): conta, sobre você (opcional), confirmação. */
export async function signUpViaForm(page: Page, email: string, password = 'senha-forte-123') {
  await page.goto('/cadastro');
  await formReady(page);
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha').fill(password);
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.getByRole('checkbox').click();
  await page.getByRole('button', { name: 'Criar conta' }).click();
}
