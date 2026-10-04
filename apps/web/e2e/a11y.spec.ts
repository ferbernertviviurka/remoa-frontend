// G01 v2 / T8: axe (WCAG 2.x A/AA) nas telas v2: Hoje, Meus mapas, Novo mapa (3 passos), Editor (resumo, card, cada aba do inspetor) e paleta ⌘K.
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { PLAN_LIMITS } from '@remoa/contracts';
import { seedMock, signUpAndLogin } from './visual/fixture';

test.use({ viewport: { width: 1440, height: 900 } });

const axe = async (page: Page) => {
  await page.waitForTimeout(500); // axe lê opacidade no meio de transições
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).exclude('nextjs-portal').analyze();
  return r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`);
};

test('axe: Hoje, Meus mapas e Novo mapa (3 passos)', async ({ page, request }) => {
  test.setTimeout(180_000);
  const { userId, headers } = await signUpAndLogin(page, request);
  await page.goto('/app/hoje');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  expect(await axe(page), 'hoje vazio').toEqual([]);
  await page.goto('/app/mapas');
  await expect(page.getByRole('heading', { level: 1, name: 'Meus mapas' })).toBeVisible();
  expect(await axe(page), 'mapas vazio').toEqual([]);

  await seedMock(request, headers, userId);
  await page.goto('/app/hoje');
  await expect(page.getByRole('link', { name: 'Abrir o mapa Sepse' })).toBeVisible();
  expect(await axe(page), 'hoje').toEqual([]);
  await page.goto('/app/mapas');
  await expect(page.getByRole('link', { name: 'Sepse' }).first()).toBeVisible();
  expect(await axe(page), 'mapas').toEqual([]);
  await page.getByRole('button', { name: 'Lista' }).click().catch(() => undefined); // alterna grade/lista, se o controle existir
  expect(await axe(page), 'mapas (lista)').toEqual([]);

  await page.goto('/app/mapas/novo');
  await expect(page.getByRole('button', { name: /Em branco/ })).toBeVisible();
  expect(await axe(page), 'novo 1').toEqual([]);
  await page.getByRole('button', { name: 'Continuar' }).click();
  expect(await axe(page), 'novo 2').toEqual([]);
  await page.goto('/app/mapas/novo?caminho=blank');
  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(page.getByLabel('Nome do mapa')).toBeVisible();
  expect(await axe(page), 'novo 3 (Sobre o mapa)').toEqual([]);
});

test('axe: Editor (resumo, card, cada aba do inspetor) e paleta ⌘K', async ({ page, request }) => {
  test.setTimeout(180_000);
  const { userId, headers } = await signUpAndLogin(page, request);
  const { sepse } = await seedMock(request, headers, userId);
  await page.goto(`/app/mapas/${sepse}`);
  await expect(page.locator('.react-flow__node')).toHaveCount(6);
  expect(await axe(page), 'editor resumo').toEqual([]);
  await page.getByRole('button', { name: 'Selecionar Choque séptico' }).click();
  const panel = page.getByRole('complementary', { name: 'Painel do mapa' });
  await expect(panel.getByRole('heading', { level: 2, name: 'Choque séptico' })).toBeVisible();
  for (const tab of ['Conteúdo', 'Rubrica', 'Origem', 'Histórico']) {
    await panel.getByRole('tab', { name: tab }).click();
    await expect(panel.getByRole('tab', { name: tab })).toHaveAttribute('aria-selected', 'true');
    expect(await axe(page), `aba ${tab}`).toEqual([]);
  }
  for (const layer of ['Estrutura', 'Cobertura', 'Lembrança']) {
    await page.getByRole('button', { name: layer, exact: true }).click();
    expect(await axe(page), `camada ${layer}`).toEqual([]);
  }
  await page.keyboard.press('Meta+k');
  await expect(page.getByRole('dialog')).toBeVisible();
  expect(await axe(page), 'paleta').toEqual([]);

  // Desafio no editor (T6): antes e depois de revelar a resposta.
  await page.keyboard.press('Escape');
  await page.goto(`/app/mapas/${sepse}?modo=desafio`);
  await expect(page.getByRole('button', { name: 'Corrigir resposta' })).toBeVisible();
  await page.getByLabel('Sua resposta').fill('Iniciar noradrenalina');
  expect(await axe(page), 'desafio').toEqual([]);
  for (const mode of ['Opções', 'Falar']) { // Falar: botão de gravar desabilitado com "Em breve" (D-203)
    await page.getByRole('group', { name: 'Como responder' }).getByRole('button', { name: mode }).click();
    expect(await axe(page), `desafio: ${mode}`).toEqual([]);
  }
  await page.getByRole('group', { name: 'Como responder' }).getByRole('button', { name: 'Escrever' }).click();
  await page.getByRole('button', { name: 'Revelar resposta' }).click();
  await expect(page.getByRole('group', { name: /Como foi lembrar/ })).toBeVisible();
  expect(await axe(page), 'desafio: resposta revelada').toEqual([]);
});

test('axe: Preços, Conta (e confirmação de exclusão) e Paywall de mapas', async ({ page, request }) => {
  test.setTimeout(120_000);
  const { headers } = await signUpAndLogin(page, request);
  await page.goto('/app/planos');
  await expect(page.getByRole('table', { name: 'Comparação entre Free e Pro' })).toBeVisible();
  expect(await axe(page), 'preços').toEqual([]);
  await page.goto('/app/conta/dados');
  await expect(page.getByRole('button', { name: 'Exportar meus dados' })).toBeVisible();
  expect(await axe(page), 'conta').toEqual([]);
  await page.getByRole('button', { name: 'Excluir conta' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  expect(await axe(page), 'conta: confirmar exclusão').toEqual([]);
  await page.keyboard.press('Escape');

  for (let i = 0; i < PLAN_LIMITS.free.limits.boards; i++) expect((await request.post('http://localhost:4000/v1/boards', { headers, data: { title: `M${i}` } })).status()).toBe(201);
  await page.goto('/app/mapas/novo?caminho=blank');
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.getByLabel('Nome do mapa').fill('Terceiro');
  await page.getByRole('button', { name: 'Criar mapa', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('button', { name: 'Continuar no Free' })).toBeVisible();
  expect(await axe(page), 'paywall').toEqual([]);
});
