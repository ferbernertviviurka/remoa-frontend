// F07 T3: /cobertura, cabeçalho do mapa e vínculo em 1 clique.
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { signUpAndLogin } from './visual/fixture';

test.use({ viewport: { width: 1440, height: 900 } });
const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const axe = async (page: Page) => {
  await page.waitForTimeout(500);
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).exclude('nextjs-portal').analyze();
  return r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`);
};
type Item = { id: string; title: string; parentId: string | null };

test('cobertura: estado vazio, mapa ligado aparece na tabela e no cabeçalho do mapa', async ({ page, request }) => {
  test.setTimeout(120_000);
  const { headers } = await signUpAndLogin(page, request);
  await page.goto('/cobertura');
  await expect(page.getByRole('heading', { name: 'Cobertura Enamed' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Meus mapas' }).first()).toBeVisible();
  await expect(page.getByRole('link', { name: /^Criar mapa para / }).first()).toHaveAttribute('href', /\/mapas\/novo\?item=/);
  expect(await axe(page), 'cobertura vazia').toEqual([]);

  const items = (await (await request.get(`${API}/v1/matrix/items?area=CM`, { headers })).json()).data as Item[];
  const item = items.find((i) => i.parentId)!; // a topic, not a group heading
  const created = await request.post(`${API}/v1/boards`, { headers, data: { title: item.title, area: 'CM', matrixItemId: item.id } });
  const boardId = (await created.json()).data.id as string;

  await page.goto('/cobertura');
  await expect(page.getByRole('img', { name: /% da matriz coberta/ })).toBeVisible();
  await expect(page.getByRole('link', { name: `Abrir mapa de ${item.title}` })).toBeVisible();
  await expect(page.getByText(/não uma lista oficial do INEP, e não indicam peso de prova/)).toBeVisible();
  expect(await axe(page), 'cobertura').toEqual([]);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'sem scroll horizontal no mobile').toBe(true);
  expect(await axe(page), 'cobertura 390').toEqual([]);
  await page.getByRole('button', { name: /^Coberto/ }).click();
  await expect(page.getByText('Nenhum tema encontrado com esse filtro.')).toBeVisible();
  await page.getByRole('button', { name: 'Limpar filtros' }).click();
  await page.getByRole('searchbox', { name: 'Buscar tema' }).fill(item.title);
  await expect(page.getByRole('link', { name: `Abrir mapa de ${item.title}` })).toBeVisible();
  await page.setViewportSize({ width: 1440, height: 900 });

  await page.goto(`/mapas/${boardId}`);
  const link = page.getByRole('link', { name: new RegExp(`^cobre \\d+% de `) });
  await expect(link).toBeVisible();
  await link.click();
  await expect(page).toHaveURL(/\/cobertura$/);
});

test('mapa sem item: uma sugestão liga o mapa e a cobertura aparece no painel', async ({ page, request }) => {
  test.setTimeout(120_000);
  const { headers } = await signUpAndLogin(page, request);
  // FR-2 acceptance: "Sepse" suggests the sepse/choque item.
  const boardId = (await (await request.post(`${API}/v1/boards`, { headers, data: { title: 'Sepse', area: 'CM' } })).json()).data.id as string;
  await page.goto(`/mapas/${boardId}`);
  await page.getByRole('button', { name: 'Ligar a Sepse e choque séptico' }).click();
  await expect(page.getByRole('link', { name: /^cobre \d+% de / })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Ligar a / })).toHaveCount(0);
  const events = await page.evaluate(() => window.__remoaEvents ?? []);
  expect(events).toContainEqual({ event: 'board_linked_to_matrix', props: { count: 1, suggestedCount: 1, platform: 'web', plan: 'free', appVersion: '0.0.0' } });
});

test('lacunas: ligar um mapa que já tenho move o tema para Em andamento', async ({ page, request }) => {
  test.setTimeout(120_000);
  const { headers } = await signUpAndLogin(page, request);
  const items = (await (await request.get(`${API}/v1/matrix/items?area=CM`, { headers })).json()).data as Item[];
  const first = items.find((i) => i.parentId)!;
  const other = items.find((i) => i.parentId && i.id !== first.id)!;
  await request.post(`${API}/v1/boards`, { headers, data: { title: first.title, area: 'CM', matrixItemId: first.id } });
  await request.post(`${API}/v1/boards`, { headers, data: { title: 'Meu mapa solto', area: 'CM' } });

  await page.goto('/cobertura');
  await expect(page.getByText(/^\d+ de \d+ temas sem mapa$/)).toBeVisible();
  expect(await axe(page), 'cobertura com lacunas').toEqual([]);
  await page.getByRole('button', { name: `Ligar um mapa que já tenho a ${other.title}` }).click();
  await page.getByRole('button', { name: 'Ligar Meu mapa solto' }).click();
  await expect(page.getByRole('link', { name: `Abrir mapa de ${other.title}` })).toBeVisible();
  await expect(page.getByRole('button', { name: `Ligar um mapa que já tenho a ${other.title}` })).toHaveCount(0);
  const events = await page.evaluate(() => window.__remoaEvents ?? []);
  expect(events).toContainEqual({ event: 'board_linked_to_matrix', props: { count: 1, suggestedCount: 0, platform: 'web', plan: 'free', appVersion: '0.0.0' } });
});
