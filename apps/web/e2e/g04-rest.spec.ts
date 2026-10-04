// G04 / QA4: pontos 1, 2, 3, 4, 6 e 7 (8, 9, 10 em g04.spec.ts; 5 em home-slider.spec.ts). SHOTS=<dir> salva prints.
import { expect, test, type Page } from '@playwright/test';
import { accountUser, API } from './account/fixture';
import { makeBoards } from './plans/fixture';

const shot = (page: Page, name: string) => (process.env.SHOTS ? page.screenshot({ path: `${process.env.SHOTS}/${name}.png` }) : undefined);
test.use({ viewport: { width: 1440, height: 900 }, colorScheme: 'light' });

test('1. /conta/plano: Mensal ↔ Anual troca valor e textos com TextMorph', async ({ page, request }) => {
  test.setTimeout(120_000);
  await accountUser(page, request);
  await page.goto('/app/conta/plano');
  const offer = page.locator('section').filter({ has: page.getByRole('radiogroup', { name: /cobrança/i }) }).first();
  const group = page.getByRole('radiogroup', { name: /cobrança/i });
  await expect(group).toBeVisible();
  await expect(offer.locator('[torph-root]').first()).toBeAttached();
  expect(await offer.locator('[torph-root]').count()).toBeGreaterThanOrEqual(3); // valor, sufixo, nota
  await expect(offer).toContainText(/R\$\s*39\b/);
  await expect(offer).toContainText('Cobrado todo mês');
  await shot(page, 'p1-mensal');
  await group.getByRole('radio', { name: 'Anual' }).click();
  await expect(offer).toContainText(/R\$\s*349\b/);
  await expect(offer).toContainText('/ano');
  await expect(offer).toContainText('Equivale a');
  await expect(offer).not.toContainText('Cobrado todo mês');
  await shot(page, 'p1-anual');
  await group.getByRole('radio', { name: 'Mensal' }).click();
  await expect(offer).toContainText(/R\$\s*39\b/);
  await expect(offer).toContainText('/mês');
});

test('2 e 3. Preferências: Escuro "Em breve" desabilitado; sem "Cards novos por dia"', async ({ page, request }) => {
  test.setTimeout(120_000);
  await accountUser(page, request);
  await page.goto('/app/conta/preferencias');
  const dark = page.getByRole('radio', { name: /Escuro/ }).or(page.getByRole('button', { name: /Escuro/ })).first();
  await expect(dark).toBeVisible();
  await expect(dark).toBeDisabled();
  await expect(dark).toContainText('Em breve');
  await expect(page.getByRole('radio', { name: /Claro/ }).or(page.getByRole('button', { name: /Claro/ })).first()).toBeEnabled();
  await expect(page.getByText('Rotina de estudo')).toBeVisible();
  await expect(page.getByText(/Cards novos/i)).toHaveCount(0);
  await expect(page.getByText(/novos por dia/i)).toHaveCount(0);
  await shot(page, 'p2-p3-preferencias');
});

test('4. avatar na navbar (link para /conta) e nenhuma conta no trilho', async ({ page, request }) => {
  test.setTimeout(120_000);
  await accountUser(page, request);
  for (const path of ['/app/hoje', '/app/mapas', '/app/revisar', '/app/conta/perfil']) {
    await page.goto(path);
    const acc = page.getByLabel('Minha conta');
    await expect(acc, path).toHaveCount(1);
    await expect(page.getByRole('banner').getByLabel('Minha conta'), path).toBeVisible();
    await expect(page.locator('aside [aria-label="Minha conta"], nav [aria-label="Minha conta"]'), `trilho em ${path}`).toHaveCount(0);
  }
  await page.goto('/app/hoje');
  await shot(page, 'p4-navbar');
  await page.getByRole('banner').getByLabel('Minha conta').click();
  await expect(page).toHaveURL(/\/conta/);
});

test('6. /mapas/novo: cada alternativa troca título e passos do painel direito', async ({ page, request }) => {
  test.setTimeout(120_000);
  await accountUser(page, request);
  await page.goto('/app/mapas/novo');
  const aside = page.getByRole('complementary', { name: 'Prévia do seu mapa' });
  await expect(aside).toBeVisible();
  const cases = [
    [/Do meu PDF/, 'Do PDF ao rascunho', 'Em breve: a geração por IA'],
    [/Do meu Anki/, 'Do Anki para o mapa', 'Disponível agora'],
    [/De um mapa pronto/, 'Mapas prontos e revisados', 'Ainda não disponível'],
    [/Em branco/, 'Comece do zero', ''],
  ] as const;
  const seen = new Set<string>();
  for (const [btn, title, status] of cases) {
    await page.getByRole('button', { name: btn }).click();
    await expect(aside.getByRole('heading', { level: 2 })).toContainText(title);
    await expect(aside).toContainText('Como funciona');
    await expect(aside.locator('ol li')).toHaveCount(3);
    if (status) await expect(aside).toContainText(status);
    await expect(aside.locator('[torph-root]').first()).toBeAttached(); // TextMorph / MeasuredText
    seen.add((await aside.locator('ol').innerText()).trim());
    await shot(page, `p6-${title.replace(/\W+/g, '-')}`);
  }
  expect(seen.size).toBe(4); // passos diferentes em cada alternativa
});

test('7. Free 50 cards: "N de 50", 51º barrado, arquivar libera', async ({ page, request }) => {
  test.setTimeout(180_000);
  const { headers } = await accountUser(page, request);
  await makeBoards(request, headers, 1);
  const boards = (await (await request.get(`${API}/v1/boards`, { headers })).json()).data as { id: string }[];
  const board = boards[0]!.id;
  const card = () => ({ op: 'createCard', opId: crypto.randomUUID(), boardId: board, card: { id: crypto.randomUUID(), type: 'concept', title: `C${Math.random().toString(36).slice(2, 6)}`, position: { x: 0, y: 0 } } });
  const send = (n: number) => request.post(`${API}/v1/boards/ops`, { headers, data: { ops: Array.from({ length: n }, card) } });
  expect((await send(50)).status()).toBe(200);

  await page.goto('/app/conta/plano');
  const cards = page.getByText('50 de 50');
  await expect(cards.first()).toBeVisible();
  await shot(page, 'p7-conta-plano-50');
  // painel do plano na navbar
  await page.getByRole('button', { name: 'Ver detalhes do plano' }).hover();
  const panel = page.getByRole('dialog', { name: 'Ver detalhes do plano' });
  await expect(panel.getByText('50 de 50')).toBeVisible();
  await shot(page, 'p7-navbar-painel-50');
  await page.mouse.move(700, 700);

  // 51º pela API: 402 quota_exceeded
  const over = await send(1);
  expect(over.status()).toBe(402);
  expect((await over.json()).error.message).toBe('cards');

  // 51º pela UI: mensagem de limite
  await page.goto(`/app/mapas/${board}`);
  await expect(page.locator('.react-flow__node')).toHaveCount(50);
  await page.getByRole('button', { name: 'Adicionar Pergunta e Resposta' }).first().click();
  await expect(page.getByRole('dialog').filter({ hasText: 'limite de 50 cards do Free' })).toBeVisible();
  await shot(page, 'p7-51-barrado');
  await page.keyboard.press('Escape');

  // arquivar libera
  const r = await request.patch(`${API}/v1/boards/${board}`, { headers, data: { archived: true } });
  expect(r.status()).toBe(200);
  await page.goto('/app/conta/plano');
  await expect(page.getByText('0 de 50')).toBeVisible();
  const b2 = (await (await request.post(`${API}/v1/boards`, { headers, data: { title: 'Novo' } })).json()).data.id as string;
  const ok = await request.post(`${API}/v1/boards/ops`, { headers, data: { ops: [{ ...card(), boardId: b2 }] } });
  expect(ok.status()).toBe(200);
});
