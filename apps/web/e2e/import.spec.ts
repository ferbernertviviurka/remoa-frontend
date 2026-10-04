// F06 FR-3/FR-7: .apkg legado -> preview com amostra -> importa -> relatório -> mapa com os cards.
// Fixture: e2e/fixtures/basic.apkg (gerado por e2e/fixtures/make-basic-apkg.mjs). Precisa da API em :4000 com as rotas /v1/imports.
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { resolve } from 'node:path';
import { signUpAndLogin } from './visual/fixture';

const API = 'http://localhost:4000';
const axe = async (page: Page) => {
  // pop/fillx entry animations render colors at partial opacity (axe reads a false color-contrast on :root under load): wait for them to finish, bounded.
  await Promise.race([page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished.catch(() => undefined)))), page.waitForTimeout(1500)]);
  await page.waitForTimeout(200);
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).exclude('nextjs-portal').analyze();
  return r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`);
};
const toPreview = async (page: Page) => {
  await page.goto('/app/mapas/novo?caminho=anki');
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.locator('input[type=file]').setInputFiles(resolve('e2e/fixtures/basic.apkg'));
  await page.getByRole('button', { name: 'Importar para o mapa' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Confira o que vira o quê' })).toBeVisible({ timeout: 30_000 });
};

test.use({ viewport: { width: 1440, height: 900 } });

test('importar do Anki: preview, troca do título atualiza a amostra, relatório e mapa', async ({ page, request }) => {
  test.setTimeout(120_000);
  await signUpAndLogin(page, request);
  await toPreview(page);
  expect(await axe(page), 'preview').toEqual([]);
  await expect(page.getByText('vira o mapa “E2E Anki”')).toBeVisible();
  const table = page.getByRole('table', { name: 'Amostra de Basic' });
  await expect(table.locator('tbody tr')).toHaveCount(5);
  await expect(table.locator('tbody tr').first().locator('td').first()).toHaveText('Critério de sepse');

  await page.getByRole('combobox', { name: /^Título/ }).click();
  await page.getByRole('option', { name: 'Tema' }).click();
  await expect(table.locator('tbody tr').first().locator('td').first()).toHaveText('Sepse-3');

  await page.getByRole('button', { name: /^Importar \d+ cards?$/ }).click();
  await expect(page.getByText('Relatório da importação')).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText('Cards importados')).toBeVisible();
  expect(await axe(page), 'relatório').toEqual([]);
  await page.getByRole('button', { name: 'Abrir o mapa' }).click();
  await expect(page).toHaveURL(/\/mapas\/[0-9a-f-]{36}$/);
  await expect(page.locator('.react-flow')).toBeVisible();
  await expect(page.getByText('Sepse-3').first()).toBeVisible();
});

test('Free no limite de mapas: importar abre o paywall e volta para a prévia sem criar nada', async ({ page, request }) => {
  test.setTimeout(120_000);
  const { headers } = await signUpAndLogin(page, request);
  for (const title of ['Livre 1', 'Livre 2']) expect((await request.post(`${API}/v1/boards`, { headers, data: { title } })).status()).toBe(201);
  await toPreview(page);
  await page.getByRole('button', { name: /^Importar \d+ cards?$/ }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('heading', { level: 1, name: 'Confira o que vira o quê' })).toBeVisible();
  const boards = (await (await request.get(`${API}/v1/boards`, { headers })).json()).data as Array<{ title: string }>;
  expect(boards.map((b) => b.title).sort()).toEqual(['Livre 1', 'Livre 2']);
});
