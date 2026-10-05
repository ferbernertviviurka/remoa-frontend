// F17 T8 (G09): Anki em 3 passos → "Sobre o mapa" (nome primeiro, itens por busca, área, acesso) → um mapa com tudo o que foi escolhido.
// Substitui o import.spec.ts do F06. Fixture: e2e/fixtures/basic.apkg (raiz "E2E Anki" + "Default" vazio). Precisa da API em :4000.
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { resolve } from 'node:path';
import { psql } from './db';
import { signUpAndLogin } from './visual/fixture';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const APKG = resolve('e2e/fixtures/basic.apkg');
const axe = async (page: Page) => {
  await Promise.race([page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished.catch(() => undefined)))), page.waitForTimeout(1500)]);
  await page.waitForTimeout(200);
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).exclude('nextjs-portal').analyze();
  return r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`);
};
/** Passos 1 e 2: caminho → arquivo (o envio começa ao escolher) → "Sobre o mapa". */
const toAbout = async (page: Page) => {
  await page.goto('/app/mapas/novo?caminho=anki');
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.locator('input[type=file]').setInputFiles(APKG);
  await expect(page.getByRole('button', { name: 'Continuar' })).toBeEnabled({ timeout: 30_000 });
  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Sobre o mapa' })).toBeVisible();
};
const pick = async (page: Page, q: string, nth = 0) => {
  const box = page.getByRole('combobox', { name: 'Itens da matriz' });
  await box.fill(q);
  await page.getByRole('option').nth(nth).click();
  await box.fill('');
};

test.use({ viewport: { width: 1440, height: 900 } });

test('Anki v2: nome primeiro, 2 itens por busca, Pediatria limpa, Público, importa um mapa; reimportar no existente cria 0', async ({ page, request }) => {
  test.setTimeout(180_000);
  const { headers, userId } = await signUpAndLogin(page, request);
  // D-648: Free tem 1 importação do Anki (a reimportação do fim do teste é a 2ª): este teste roda como Pro
  psql(`insert into subscriptions (user_id, plan, status) values ('${userId}','pro','active') on conflict (user_id) do update set plan='pro'`);
  await toAbout(page);

  // FR-2/FR-3: nome é o 1º campo, com foco, preenchido com o baralho raiz (o "Default" vazio não conta).
  const name = page.getByLabel('Nome do mapa');
  await expect(name).toBeFocused();
  await expect(name).toHaveValue('E2E Anki');
  // FR-8/FR-9: resumo; mapeamento só dentro de "Ajustar importação".
  await expect(page.getByTestId('import-summary')).toContainText('baralho');
  await expect(page.getByText('Tipos de nota')).toHaveCount(0);
  expect(await axe(page), 'passo 3').toEqual([]);
  await page.getByRole('button', { name: 'Ajustar importação' }).click();
  await expect(page.getByText('Tipos de nota')).toBeVisible();
  await page.getByRole('combobox', { name: /^Título/ }).click();
  await page.getByRole('option', { name: 'Tema' }).click();
  await expect(page.getByRole('table', { name: 'Amostra de Basic' }).locator('tbody tr').first().locator('td').first()).toHaveText('Sepse-3');
  await page.getByRole('button', { name: 'Ajustar importação' }).click();

  // FR-5: busca sem acento/maiúscula, 2 itens como chips.
  await pick(page, 'SÉPSE');
  await pick(page, 'pneumonia');
  const chips = page.getByRole('button', { name: /^Remover / });
  await expect(chips).toHaveCount(2);
  // FR-4/FR-6: Pediatria limpa os itens e avisa; volta para CM e escolhe de novo.
  await page.getByRole('group', { name: 'Grande área' }).getByRole('button', { name: 'Pediatria' }).click();
  await expect(page.getByText('Os itens foram limpos porque a área mudou.')).toBeVisible();
  await expect(page.getByText('A matriz Enamed desta área ainda não está disponível.')).toBeVisible();
  await page.getByRole('group', { name: 'Grande área' }).getByRole('button', { name: 'Clínica Médica' }).click();
  await pick(page, 'sepse');
  await pick(page, 'pneumonia');
  await expect(chips).toHaveCount(2);
  const itemTitles = (await chips.evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')!.replace(/^Remover /, '')))).sort();
  await page.getByRole('radio', { name: 'Público' }).click();

  // FR-18: um botão primário no rodapé.
  await page.getByRole('button', { name: /^Importar \d+ cards?$/ }).click();
  await expect(page.getByText('Relatório da importação')).toBeVisible({ timeout: 60_000 });
  expect(await axe(page), 'relatório').toEqual([]);
  await page.getByRole('button', { name: 'Abrir mapa' }).click();
  await expect(page).toHaveURL(/\/mapas\/[0-9a-f-]{36}$/);
  const boardId = page.url().split('/').pop()!;
  await expect(page.locator('.react-flow')).toBeVisible();

  // FR-10: um mapa, com título, área, itens e acesso enviados.
  const boards = (await (await request.get(`${API}/v1/boards`, { headers })).json()).data as Array<{ id: string; title: string; area: string }>;
  expect(boards.filter((b) => b.title === 'E2E Anki')).toEqual([expect.objectContaining({ id: boardId, area: 'CM' })]);
  const share = (await (await request.get(`${API}/v1/boards/${boardId}/share`, { headers })).json()).data as { access: string; url: string };
  expect(share.access).toBe('public');
  const token = share.url.split('/m/')[1]!;
  const pub = (await (await request.get(`${API}/v1/public/shared/${token}`)).json()).data as { title: string; matrixItems: { title: string }[] };
  expect(pub.title).toBe('E2E Anki');
  expect(pub.matrixItems.map((i) => i.title).sort()).toEqual(itemTitles);

  // FR-11: mesmo nome pergunta; no existente, repetidos são ignorados (0 novos).
  await toAbout(page);
  await page.getByRole('button', { name: /^Importar \d+ cards?$/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Já existe um mapa com esse nome' });
  await expect(dialog).toBeVisible();
  expect(await axe(page), 'diálogo mapa existente').toEqual([]);
  await dialog.getByRole('button', { name: /Importar no mapa existente/ }).click();
  await expect(page.getByText('Relatório da importação')).toBeVisible({ timeout: 60_000 });
  await expect(page.getByRole('term').filter({ hasText: 'Cards importados' }).locator('xpath=following-sibling::dd')).toHaveText('0');
  const after = (await (await request.get(`${API}/v1/boards`, { headers })).json()).data as Array<{ title: string }>;
  expect(after.filter((b) => b.title.startsWith('E2E Anki'))).toHaveLength(1);
});

test('Free no limite de mapas: importar abre o paywall e volta ao resumo sem criar nada', async ({ page, request }) => {
  test.setTimeout(120_000);
  const { headers } = await signUpAndLogin(page, request);
  for (const title of ['Livre 1', 'Livre 2']) expect((await request.post(`${API}/v1/boards`, { headers, data: { title } })).status()).toBe(201);
  await toAbout(page);
  await page.getByRole('button', { name: /^Importar \d+ cards?$/ }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('import-summary')).toBeVisible();
  const boards = (await (await request.get(`${API}/v1/boards`, { headers })).json()).data as Array<{ title: string }>;
  expect(boards.map((b) => b.title).sort()).toEqual(['Livre 1', 'Livre 2']);
});
