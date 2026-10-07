import AxeBuilder from '@axe-core/playwright';
import { createBlankBoard } from './create-map';
import { signUpViaForm } from './sign-up';
import { expect, test, type Page } from '@playwright/test';

const axe = async (page: Page) => {
  await page.waitForTimeout(400);
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).exclude('nextjs-portal').analyze();
  return r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`);
};

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
  expect(await axe(page), 'sessão depois do Não sei').toEqual([]);
});

/** Bearer of the logged-in cookie session, for API calls on the same user. */
async function sessionHeaders(page: Page) {
  const cookies = await page.context().cookies();
  const raw = cookies.filter((c) => /auth-token(\.\d+)?$/.test(c.name)).sort((a, b) => a.name.localeCompare(b.name)).map((c) => c.value).join('');
  const json = JSON.parse(Buffer.from(raw.replace(/^base64-/, ''), 'base64url').toString()) as { access_token: string };
  return { authorization: `Bearer ${json.access_token}` };
}

test('formato 1 com IA simulada: a pergunta entra no banco e a resposta do card não aparece', async ({ page }) => {
  test.setTimeout(180_000);
  const bodies: Promise<string>[] = [];
  page.on('response', (res) => {
    if (res.url().includes('/v1/challenge-ai')) bodies.push(res.text().catch(() => ''));
  });
  await signUpViaForm(page, `e2e-challenge-ai-gen-${Date.now()}@remoa.test`);
  await page.goto('/app/mapas');
  const api = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
  const list = (await (await page.request.get(`${api}/v1/matrix/items?area=CM`, { headers: await sessionHeaders(page) })).json()).data as { id: string; parentId: string | null }[];
  const leaf = list.find((x) => !list.some((c) => c.parentId === x.id));
  expect(leaf, 'folha da matriz de Clínica Médica').toBeTruthy();
  await page.goto(`/app/mapas/novo?item=${leaf!.id}`);
  await expect(page.getByRole('heading', { level: 1, name: 'Sobre o mapa' })).toBeVisible();
  await page.getByLabel('Nome do mapa').fill('Mapa sintético');
  await page.getByRole('button', { name: 'Criar mapa', exact: true }).click();
  await expect(page).toHaveURL(/\/mapas\/[0-9a-f-]{36}$/);
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
  await setup.getByRole('radio', { name: 'A IA cria as perguntas' }).click();
  await setup.getByRole('radio', { name: '1', exact: true }).click();
  await setup.getByRole('button', { name: 'Começar desafio' }).click();

  await expect(page).toHaveURL(/\/desafio-ia\?session=/);
  await expect(page.getByText('Qual registro o card traz?')).toBeVisible();
  await expect(page.locator('body')).not.toContainText(ANSWER);
  expect(await axe(page), 'sessão da pergunta gerada').toEqual([]);

  await page.goto('/app/banco-de-questoes');
  await expect(page.getByRole('heading', { name: 'Banco de questões' })).toBeVisible();
  const row = page.getByRole('article', { name: 'Qual registro o card traz?' });
  await expect(row).toBeVisible();
  expect(await axe(page), 'banco de questões').toEqual([]);
  await expect(row).not.toContainText(ANSWER);
  await page.getByRole('searchbox', { name: 'Buscar no enunciado' }).fill('registro');
  await expect(row).toBeVisible();
  await page.getByRole('searchbox', { name: 'Buscar no enunciado' }).fill('zzzz-ausente');
  await expect(row).toHaveCount(0);
  expect((await Promise.all(bodies)).join('\n')).not.toMatch(/correct_?key|expected_?answer|key_?points/i);
});
