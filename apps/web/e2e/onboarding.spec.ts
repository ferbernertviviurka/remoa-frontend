import { expect, test, type Page } from '@playwright/test';
import { accountUser } from './account/fixture';
import { fillAbout, formReady } from './sign-up';
import AxeBuilder from '@axe-core/playwright';

const axe = async (page: Page) => {
  await page.waitForTimeout(1200); // transições
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).exclude('nextjs-portal').analyze();
  return r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`);
};

test('onboarding: cadastro novo cai nos 6 passos, "em branco" leva ao Novo mapa e a segunda visita não redireciona', async ({ page }) => {
  await page.goto('/cadastro');
  await formReady(page);
  await page.getByLabel('E-mail').fill(`e2e-onb-${Date.now()}@remoa.test`);
  await page.getByLabel('Senha').fill('senha-forte-123');
  await page.getByRole('button', { name: 'Continuar' }).click();
  await fillAbout(page);
  await page.getByRole('checkbox').click();
  await page.getByRole('button', { name: 'Criar conta' }).click();

  await expect(page).toHaveURL(/\/app\/onboarding$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Conte quem você é'); // "Você é?" saiu do cadastro: 1º passo
  expect(await axe(page)).toEqual([]);
  await page.getByRole('button', { name: 'Aluno' }).click();
  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Em que momento você está?');
  await page.getByRole('button', { name: '5º–6º ano' }).click();
  await page.getByRole('button', { name: 'Continuar' }).click();
  // G20: instituição de ensino, da lista (busca sem acento pela sigla/cidade)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Onde você estuda (ou estudou)?');
  await page.getByLabel('Instituição de ensino').fill('sao paulo');
  await page.getByRole('option').first().click();
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.getByRole('button', { name: 'Enamed 2027.1' }).click();
  await page.getByRole('button', { name: 'USP' }).click(); // G14 13: mais de um objetivo
  await page.getByRole('button', { name: 'Continuar' }).click();
  for (const area of ['Cirurgia', 'Ginecologia e Obstetrícia', 'Pediatria', 'Medicina Preventiva e Saúde Coletiva']) {
    await expect(page.getByRole('button', { name: new RegExp(`^${area}`) })).toBeDisabled(); // G14 16: "Em breve"
  }
  await page.getByRole('button', { name: 'Clínica Médica' }).click();
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.getByRole('button', { name: /Em branco/ }).click();
  await page.getByRole('button', { name: 'Ir para o primeiro mapa' }).click();
  await expect(page).toHaveURL(/\/app\/mapas\/novo\?caminho=blank&de=onboarding$/);
  await expect(page.getByLabel('Nome do mapa')).toBeVisible(); // G14 17: direto no passo 2 (Sobre o mapa)

  // done: Hoje is not redirected, the onboarding page itself sends back to Hoje, and the checklist is there
  await page.goto('/app/hoje');
  await expect(page).toHaveURL(/\/app\/hoje$/);
  await expect(page.getByRole('heading', { name: 'Comece por aqui' })).toBeVisible();
  await expect(page.getByText('Instalar no celular')).toBeVisible();
  await page.goto('/app/onboarding');
  await expect(page).toHaveURL(/\/app\/hoje$/);
});

test('G20: conta sem nome, telefone e tipo é levada ao passo "Conte quem você é" e volta ao destino', async ({ page, request }) => {
  test.setTimeout(90_000);
  await accountUser(page, request, null, false);
  await page.goto('/app/mapas');
  await expect(page).toHaveURL(/\/app\/onboarding\?next=%2Fapp%2Fmapas$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Conte quem você é');
  expect(await axe(page)).toEqual([]);
  await expect(page.getByRole('button', { name: 'Continuar' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Pular por enquanto' })).toHaveCount(0); // não dá para pular
  await page.getByLabel('Nome').fill('Marina Alves');
  await page.getByLabel('Telefone').fill('11912345678');
  await page.getByRole('button', { name: 'Professor' }).click();
  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(page).toHaveURL(/\/app\/mapas$/); // onboarding já concluído (conta antiga): só esse passo e volta ao destino
});

test('G20: "Não estudo medicina" e instituição em texto livre', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('/cadastro');
  await formReady(page);
  await page.getByLabel('E-mail').fill(`e2e-onb2-${Date.now()}@remoa.test`);
  await page.getByLabel('Senha').fill('senha-forte-123');
  await page.getByRole('button', { name: 'Continuar' }).click();
  await fillAbout(page);
  await page.getByRole('checkbox').click();
  await page.getByRole('button', { name: 'Criar conta' }).click();
  await expect(page).toHaveURL(/\/app\/onboarding$/, { timeout: 30_000 });
  await page.getByRole('button', { name: 'Aluno' }).click();
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.getByRole('button', { name: 'Não estudo medicina' }).click();
  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Qual instituição de ensino?');
  await page.getByLabel('Instituição de ensino').fill('Escola Técnica Exemplo');
  await page.getByRole('option', { name: /Usar “Escola Técnica Exemplo”/ }).click();
  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Quais são os seus objetivos?');
});
