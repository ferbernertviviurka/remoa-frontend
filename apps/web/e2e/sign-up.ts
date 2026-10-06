import { expect, type Page } from '@playwright/test';

/** The auth forms set `data-ready` once hydrated; text typed before that is wiped by the controlled inputs (G08). */
export const formReady = (page: Page) => page.locator('form[data-ready]').waitFor();

/** Passo "Sobre você": nome e telefone são obrigatórios (G20); sexo e endereço são opcionais; "Você é" fica no onboarding. */
export async function fillAbout(page: Page, name = 'Aluna Teste', phone = '11912345678') {
  await page.getByLabel('Como podemos te chamar?').fill(name);
  await page.getByLabel('Telefone').fill(phone);
  await page.getByRole('button', { name: 'Continuar' }).click();
}

/** Cadastro pelo formulário em 3 passos (G08): conta, sobre você (nome e telefone obrigatórios), confirmação. */
export async function signUpViaForm(page: Page, email: string, password = 'senha-forte-123') {
  await page.goto('/cadastro');
  await formReady(page);
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha').fill(password);
  await page.getByRole('button', { name: 'Continuar' }).click();
  await fillAbout(page);
  await page.getByRole('checkbox').click();
  await page.getByRole('button', { name: 'Criar conta' }).click();
  await skipOnboarding(page);
}

/** F12: a new account lands in the onboarding first; most specs are about something else, so they skip it and end on Hoje. */
export async function skipOnboarding(page: Page) {
  // a new account always lands here (the redirect may flash /app/hoje first); under a long dev-server run the first /app/hoje render can stall: go to the onboarding directly
  await page.waitForURL(/\/app\/onboarding$/, { timeout: 30_000 }).catch(() => page.goto('/app/onboarding'));
  // G20: "Conte quem você é" (tipo) can't be skipped; a click before hydration is lost, so retry until the step changes
  await expect(async () => {
    await page.getByRole('button', { name: 'Aluno' }).click();
    await page.getByRole('button', { name: 'Continuar' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Em que momento você está?', { timeout: 3000 });
  }).toPass({ timeout: 30_000 });
  await expect(async () => {
    await page.getByRole('button', { name: 'Pular por enquanto' }).click();
    await page.waitForURL(/\/app\/hoje$/, { timeout: 15_000, waitUntil: 'commit' }); // cold dev compile of Hoje can take several seconds
  }).toPass({ timeout: 30_000 });
}
