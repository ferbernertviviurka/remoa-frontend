import { expect, test, type Page } from '@playwright/test';
import { formReady } from './sign-up';
import AxeBuilder from '@axe-core/playwright';

const axe = async (page: Page) => {
  await page.waitForTimeout(1200); // transições
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).exclude('nextjs-portal').analyze();
  return r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`);
};

test('onboarding: cadastro novo cai nos 4 passos, "em branco" leva ao Novo mapa e a segunda visita não redireciona', async ({ page }) => {
  await page.goto('/cadastro');
  await formReady(page);
  await page.getByLabel('E-mail').fill(`e2e-onb-${Date.now()}@remoa.test`);
  await page.getByLabel('Senha').fill('senha-forte-123');
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.getByRole('checkbox').click();
  await page.getByRole('button', { name: 'Criar conta' }).click();

  await expect(page).toHaveURL(/\/app\/onboarding$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Em que momento você está?');
  expect(await axe(page)).toEqual([]);
  await page.getByRole('button', { name: '5º–6º ano' }).click();
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.getByRole('button', { name: 'Enamed 2027.1' }).click();
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.getByRole('button', { name: 'Clínica Médica' }).click();
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.getByRole('button', { name: /Em branco/ }).click();
  await page.getByRole('button', { name: 'Ir para o primeiro mapa' }).click();
  await expect(page).toHaveURL(/\/app\/mapas\/novo\?caminho=blank&de=onboarding$/);

  // done: Hoje is not redirected, the onboarding page itself sends back to Hoje, and the checklist is there
  await page.goto('/app/hoje');
  await expect(page).toHaveURL(/\/app\/hoje$/);
  await expect(page.getByRole('heading', { name: 'Comece por aqui' })).toBeVisible();
  await expect(page.getByText('Instalar no celular')).toBeVisible();
  await page.goto('/app/onboarding');
  await expect(page).toHaveURL(/\/app\/hoje$/);
});
