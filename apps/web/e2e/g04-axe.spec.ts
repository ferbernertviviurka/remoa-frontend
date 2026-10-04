// G04 / QA4: axe (WCAG 2.1 AA) nas telas tocadas pelos 10 pontos.
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { accountUser } from './account/fixture';
import { makeBoards } from './plans/fixture';
import { createMockSepse } from './visual/fixture';

test.use({ viewport: { width: 1440, height: 900 }, colorScheme: 'light' });
const axe = async (page: Page) => {
  await page.waitForTimeout(1200); // transições (pop 400 ms, TextMorph 320 ms)
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).exclude('nextjs-portal').analyze();
  return r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`);
};

test('axe: conta/plano (mensal e anual), preferências, novo mapa (4 alternativas)', async ({ page, request }) => {
  test.setTimeout(180_000);
  await accountUser(page, request);
  await page.goto('/app/conta/plano');
  expect(await axe(page), 'plano mensal').toEqual([]);
  await page.getByRole('radio', { name: 'Anual' }).click();
  expect(await axe(page), 'plano anual').toEqual([]);
  await page.goto('/app/conta/preferencias');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  expect(await axe(page), 'preferências').toEqual([]);
  await page.goto('/app/mapas/novo');
  for (const n of [/Do meu PDF/, /Do meu Anki/, /De um mapa pronto/, /Em branco/]) {
    await page.getByRole('button', { name: n }).click();
    expect(await axe(page), `novo mapa ${n}`).toEqual([]);
  }
});

test('axe: Home com cartão de limite', async ({ page, request }) => {
  test.setTimeout(120_000);
  const { headers } = await accountUser(page, request);
  await makeBoards(request, headers, 2);
  await page.goto('/app/hoje');
  await expect(page.getByText('Limite do plano Free')).toBeVisible();
  expect(await axe(page), 'home').toEqual([]);
});

test('axe: editor com painel do card aberto e desafio', async ({ page, request }) => {
  test.setTimeout(120_000);
  const { userId, headers } = await accountUser(page, request);
  const sepse = await createMockSepse(request, headers, userId);
  await page.goto(`/app/mapas/${sepse}`);
  await expect(page.locator('.react-flow__node').first()).toBeVisible();
  await page.waitForTimeout(800);
  await page.locator('.react-flow__node').first().dblclick();
  await expect(page.getByRole('form').first()).toBeVisible();
  expect(await axe(page), 'editor com painel do card').toEqual([]);
  await page.goto(`/app/mapas/${sepse}?modo=desafio`);
  await expect(page.getByRole('button', { name: 'Pular', exact: true })).toBeVisible();
  expect(await axe(page), 'desafio').toEqual([]);
});
