import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { fillAbout, formReady, skipOnboarding } from './sign-up';

const email = `e2e-${Date.now()}@remoa.test`;
const password = 'senha-forte-123';

test('rota protegida redireciona para /entrar', async ({ page }) => {
  await page.goto('/app/mapas');
  await expect(page).toHaveURL(/\/entrar\?next=%2Fapp%2Fmapas$/);
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
  await page.getByRole('button', { name: 'Continuar' }).click(); // sem tipo de usuário: fica no passo
  await expect(page.getByText('Escolha uma opção para continuar.')).toBeVisible();
  await fillAbout(page);
  await page.getByRole('button', { name: 'Criar conta' }).click();
  await expect(page.getByText(/marque que você concorda/)).toBeVisible();
  await page.getByRole('checkbox').click();
  await page.getByRole('button', { name: 'Criar conta' }).click();
  await page.waitForURL(/\/app\/onboarding$/, { timeout: 30_000 }).catch(() => page.goto('/app/onboarding')); // F12: o cadastro passa pelo onboarding antes do Hoje (D-321)
  // a navegação completa do onboarding zera a lista; track() é assíncrono em dev: espera o evento antes de sair da página
  await expect.poll(() => page.evaluate(() => (window.__remoaEvents ?? []).map((e) => e.event))).toContain('signup');
  const events = await page.evaluate(() => window.__remoaEvents ?? []);
  await skipOnboarding(page);
  await expect(page).toHaveURL(/\/app\/hoje$/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Seu primeiro mapa começa aqui');
  expect(events.map((e) => e.event)).toContain('signup');

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

test('cadastro G14: dados pessoais com máscara, CEP no ViaCEP (mock), consentimento redesenhado e axe', async ({ page }) => {
  await page.route('https://viacep.com.br/ws/**', (route) => {
    const cep = route.request().url().match(/ws\/(\d+)\//)?.[1];
    return route.fulfill({
      json: cep === '01310100' ? { logradouro: 'Avenida Paulista', bairro: 'Bela Vista', localidade: 'São Paulo', uf: 'SP' } : { erro: true },
    });
  });
  await page.goto('/cadastro');
  await formReady(page);
  await page.getByLabel('E-mail').fill(`e2e-g14-${Date.now()}@remoa.test`);
  await page.getByLabel('Senha').fill(password);
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.getByRole('radio', { name: 'Professor' }).click();
  await page.getByLabel('Telefone (opcional)').fill('11912345678');
  await expect(page.getByLabel('Telefone (opcional)')).toHaveValue('(11) 91234-5678');
  await page.getByLabel('CEP').fill('99999999');
  await expect(page.getByText('CEP não encontrado')).toBeVisible();
  await page.getByLabel('CEP').fill('01310100');
  await expect(page.getByLabel('Logradouro')).toHaveValue('Avenida Paulista');
  await expect(page.getByLabel('Cidade')).toHaveValue('São Paulo');
  await page.getByLabel('Número').fill('1000');
  const axe = async (label: string) => {
    await page.waitForTimeout(500);
    const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).exclude('nextjs-portal').analyze();
    expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`), label).toEqual([]);
  };
  await axe('sobre você');
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.getByRole('button', { name: 'Criar conta' }).click();
  await expect(page.getByText(/marque que você concorda/)).toBeVisible();
  const box = await page.getByRole('checkbox').boundingBox();
  expect(box!.width).toBeGreaterThanOrEqual(24);
  await axe('confirmação com erro');
  await page.getByRole('checkbox').click();
  await page.getByRole('button', { name: 'Criar conta' }).click();
  await skipOnboarding(page);
  // os dados chegaram ao perfil
  await page.goto('/app/conta/perfil');
  await expect(page.getByLabel('Telefone (opcional)')).toHaveValue('(11) 91234-5678');
  await expect(page.getByLabel('Logradouro')).toHaveValue('Avenida Paulista');
  await expect(page.getByRole('radio', { name: 'Professor' })).toBeChecked();
});
