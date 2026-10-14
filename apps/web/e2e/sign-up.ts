import { expect, type Page } from '@playwright/test';
import { dropTrial } from './db';

/** The auth forms set `data-ready` once hydrated; text typed before that is wiped by the controlled inputs (G08). */
export const formReady = (page: Page) => page.locator('form[data-ready]').waitFor();

/** F35 passo 1 "Conta": nome, e-mail e senha. */
export async function fillAccount(page: Page, email: string, password = 'senha-forte-123', name = 'Aluna Teste') {
  await page.getByLabel('Seu nome').fill(name);
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha').fill(password);
  await page.getByRole('button', { name: 'Continuar' }).click();
}

/** F35 passo 2 "Seu estudo": curso (com objetivo automático) e Continuar. Default: Medicina estudante (Enamed no menu, como antes). */
export async function fillAbout(page: Page, course = 'Medicina') {
  await page.getByRole('combobox', { name: 'Curso ou área' }).fill(course.slice(0, 5));
  await page.getByRole('option', { name: new RegExp(`^${course}`) }).first().click();
  await expect(page.getByText(/Objetivo sugerido/)).toBeVisible();
  await page.getByRole('button', { name: 'Continuar' }).click();
}

/** Cadastro em 3 passos (F35): Conta, Seu estudo, Revisar; depois "Conta criada" e o CTA leva ao onboarding. */
export async function signUpViaForm(page: Page, email: string, password = 'senha-forte-123') {
  await page.goto('/cadastro');
  await formReady(page);
  await fillAccount(page, email, password);
  await fillAbout(page);
  await page.getByRole('checkbox').click();
  await page.getByRole('button', { name: 'Criar conta' }).click();
  await expect(() => expect(dropTrial(email)).toBe(1)).toPass({ timeout: 30_000 });
  await expect(page.getByRole('heading', { name: /^Conta criada/ })).toBeVisible();
  await page.goto('/app/onboarding'); // the success CTAs carry ?next= (Enamed, plan); most specs want Hoje
  await skipOnboarding(page);
}

/** F12: a new account lands in the onboarding first; most specs are about something else, so they skip it and end on Hoje. */
export async function skipOnboarding(page: Page) {
  // a new account always lands here (the redirect may flash /app/hoje first); under a long dev-server run the first /app/hoje render can stall: go to the onboarding directly
  await page.waitForURL(/\/app\/onboarding(\?|$)/, { timeout: 30_000 }).catch(() => page.goto('/app/onboarding'));
  // G20: "Conte quem você é" (telefone, tipo) can't be skipped; a click before hydration is lost, so retry until the step changes.
  // F35: the sign-up no longer asks the phone, and its "Seu estudo" skips the segment/goal steps (next is the area step).
  await expect(async () => {
    const phone = page.getByLabel('Telefone');
    if (await phone.isVisible()) await phone.fill('11912345678');
    await page.getByRole('button', { name: 'Aluno' }).click();
    // a phone typed before hydration is wiped and Continuar stays disabled: a bounded click lets the retry type it again
    await page.getByRole('button', { name: 'Continuar' }).click({ timeout: 3000 });
    await expect(page.getByRole('heading', { level: 1 })).not.toHaveText('Conte quem você é', { timeout: 3000 });
  }).toPass({ timeout: 30_000 });
  await expect(async () => {
    await page.getByRole('button', { name: 'Pular por enquanto' }).click();
    await page.waitForURL(/\/app\/hoje$/, { timeout: 15_000, waitUntil: 'commit' }); // cold dev compile of Hoje can take several seconds
  }).toPass({ timeout: 30_000 });
}
