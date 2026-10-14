import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { fillAbout, fillAccount, formReady, skipOnboarding } from './sign-up';

const email = `e2e-${Date.now()}@remoa.test`;
const password = 'senha-forte-123';

test('rota protegida redireciona para /entrar', async ({ page }) => {
  await page.goto('/app/mapas');
  await expect(page).toHaveURL(/\/entrar\?next=%2Fapp%2Fmapas$/);
});

test('cadastro, logout e login', async ({ page }) => {
  // F35: 3 passos (Conta, Seu estudo, Revisar). Nome, e-mail e senha no passo 1; o telefone saiu do cadastro (onboarding "Conte quem você é").
  await page.goto('/cadastro');
  await formReady(page);
  await page.getByLabel('Seu nome').fill('Aluna Teste');
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha').fill('curta');
  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(page.getByText('Use 8 ou mais caracteres')).toBeVisible(); // fica no passo 1
  await page.getByLabel('Senha').fill(password);
  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(page.locator('[aria-current="step"]')).toContainText('Seu estudo');
  await page.getByRole('button', { name: 'Voltar' }).click();
  await expect(page.getByLabel('E-mail')).toHaveValue(email); // voltar não perde o digitado
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.getByRole('button', { name: 'Continuar' }).click(); // sem curso: validação do passo, não avança
  await expect(page.getByText('Escolha o seu curso.')).toBeVisible();
  await fillAbout(page);
  await page.getByRole('button', { name: 'Criar conta' }).click();
  await expect(page.getByText(/marque que você concorda/)).toBeVisible();
  await page.getByRole('checkbox').click();
  await page.getByRole('button', { name: 'Criar conta' }).click();
  // F35: o cadastro termina na tela "Conta criada" (CTAs levam ao onboarding); o evento sai antes de qualquer navegação, que zeraria a lista
  await expect(page.getByRole('heading', { name: /^Conta criada/ })).toBeVisible({ timeout: 30_000 });
  await expect.poll(() => page.evaluate(() => (window.__remoaEvents ?? []).map((e) => e.event))).toContain('signup');
  const events = await page.evaluate(() => window.__remoaEvents ?? []);
  await page.goto('/app/onboarding'); // F12: o cadastro passa pelo onboarding antes do Hoje (D-321)
  await skipOnboarding(page);
  await expect(page).toHaveURL(/\/app\/hoje$/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Seu primeiro mapa começa aqui');
  expect(events.map((e) => e.event)).toContain('signup');
  expect(JSON.stringify(events)).not.toMatch(/Enfermagem|Medicina|COREN|CRM/); // telemetria sem texto livre do estudo

  await page.goto('/app/conta');
  await expect(page.getByRole('region', { name: 'Resumo do perfil' }).getByText(email, { exact: true })).toBeVisible();
  await page.waitForLoadState('networkidle'); // the button is client-only: a click before hydration is lost
  await page.getByRole('button', { name: 'Sair' }).click();
  await expect(page).toHaveURL(/\/entrar$/); // G14 D-585

  await page.goto('/entrar');
  await formReady(page);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByText('Informe um e-mail válido')).toBeVisible(); // validação por campo
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha').fill(password);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).toHaveURL(/\/app\/hoje$/); // D-321: pós-login cai no Hoje
});

test('cadastro F35: validação por passo, consentimento e axe nos 3 passos', async ({ page }) => {
  // G14 (máscara de telefone e CEP) saiu do cadastro: vive no onboarding e em Conta > Perfil (cobertos em account/).
  await page.goto('/cadastro');
  await formReady(page);
  const axe = async (label: string) => {
    await page.waitForTimeout(500);
    const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).exclude('nextjs-portal').analyze();
    expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`), label).toEqual([]);
  };
  await axe('conta');
  await fillAccount(page, `e2e-g14-${Date.now()}@remoa.test`, password, 'Ana Souza');
  await expect(page.getByRole('heading', { level: 1, name: 'Seu estudo' })).toBeVisible();
  await axe('seu estudo');
  await fillAbout(page);
  await expect(page.getByRole('heading', { level: 1, name: 'Confira e crie a conta' })).toBeVisible();
  await page.getByRole('button', { name: 'Criar conta' }).click();
  await expect(page.getByText(/marque que você concorda/)).toBeVisible();
  const box = await page.getByRole('checkbox').boundingBox();
  expect(box!.width).toBeGreaterThanOrEqual(24);
  await axe('confirmação com erro');
  await page.getByRole('checkbox').click();
  await page.getByRole('button', { name: 'Criar conta' }).click();
  await skipOnboarding(page);
  // o estudo escolhido chegou ao perfil (Medicina, estudante)
  await page.goto('/app/conta/perfil');
  await expect(page.getByText('Estudante de Medicina').first()).toBeVisible();
});
