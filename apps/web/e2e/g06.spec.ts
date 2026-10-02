// G06 / ED6: tamanho livre (redimensionar e recarregar), card Conteúdo fora do desafio, imagem num passo e na resposta,
// tooltip do caso por teclado, painel com data-state open/closed, Falar "Em breve". SHOTS=<dir> salva prints.
import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import { createMockSepse, signUpAndLogin } from './visual/fixture';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const shot = (page: Page, name: string) => (process.env.SHOTS ? page.screenshot({ path: `${process.env.SHOTS}/${name}.png` }) : undefined);
const node = (page: Page, title: string) => page.locator('.react-flow__node').filter({ has: page.getByRole('button', { name: `Selecionar ${title}` }) });
const panel = (page: Page) => page.getByRole('complementary', { name: 'Painel do mapa' });
const form = (page: Page) => panel(page).getByRole('form');
const saved = (page: Page) => expect(page.getByText(/Salvo (agora|há)/)).toBeVisible({ timeout: 20_000 });

test.use({ viewport: { width: 1440, height: 900 }, colorScheme: 'light' });

type Seed = { title: string; type: 'concept' | 'note' | 'flow' | 'case'; x: number; y: number; put?: Record<string, unknown> };
async function board(request: APIRequestContext, headers: { authorization: string }, title: string, cards: Seed[]) {
  const call = async (path: string, method: 'POST' | 'PUT', data: unknown) => {
    const r = await request.fetch(`${API}${path}`, { method, headers, data });
    expect(r.ok(), `${path} ${r.status()} ${await r.text()}`).toBeTruthy();
    return (await r.json()).data;
  };
  const id = (await call('/v1/boards', 'POST', { title })).id as string;
  const ids = cards.map(() => crypto.randomUUID());
  if (cards.length) await call('/v1/boards/ops', 'POST', {
    ops: cards.map((c, i) => ({ op: 'createCard', opId: crypto.randomUUID(), boardId: id, card: { id: ids[i], type: c.type, title: c.title, position: { x: c.x, y: c.y } } })),
  });
  for (const [i, c] of cards.entries())
    if (c.put) await call(`/v1/cards/${ids[i]}`, 'PUT', { title: c.title, type: c.type, front: null, back: null, source: null, payload: {}, ...c.put });
  return id;
}

async function png(page: Page): Promise<{ name: string; mimeType: string; buffer: Buffer }> {
  const b64 = await page.evaluate(() => {
    const c = document.createElement('canvas');
    c.width = 400;
    c.height = 300;
    const g = c.getContext('2d')!;
    g.fillStyle = '#e0f2fe';
    g.fillRect(0, 0, 400, 300);
    g.fillStyle = '#c2410c';
    g.fillRect(40, 40, 120, 80);
    return c.toDataURL('image/png').split(',')[1]!;
  });
  return { name: 'g06.png', mimeType: 'image/png', buffer: Buffer.from(b64, 'base64') };
}

test('1. redimensionar pela alça do canto grava o tamanho; recarregar mantém; desfazer volta', async ({ page, request }) => {
  test.setTimeout(120_000);
  const { headers } = await signUpAndLogin(page, request);
  const id = await board(request, headers, 'Tamanhos', [{ title: 'Sepse', type: 'concept', x: 80, y: 120, put: { front: 'Qual a definição?', back: 'Disfunção orgânica' } }]);
  await page.goto(`/mapas/${id}`);
  const card = node(page, 'Sepse');
  await expect(card).toBeVisible();
  const before = (await card.boundingBox())!;
  await expect(page.locator('.react-flow__resize-control')).toHaveCount(0); // only on the selected card
  await card.getByRole('button', { name: 'Selecionar Sepse' }).click();
  await expect(card.locator('.react-flow__resize-control')).toHaveCount(4);
  const handle = card.locator('.react-flow__resize-control.bottom.right');
  const h = (await handle.boundingBox())!;
  await page.mouse.move(h.x + h.width / 2, h.y + h.height / 2);
  await page.mouse.down();
  await page.mouse.move(h.x + 60, h.y + 40, { steps: 6 });
  await page.mouse.move(h.x + 120, h.y + 90, { steps: 6 });
  await page.mouse.up();
  const after = (await card.boundingBox())!;
  expect(after.width).toBeGreaterThan(before.width + 80);
  expect(after.height).toBeGreaterThan(before.height + 60);
  expect(Math.abs(after.x - before.x)).toBeLessThan(2); // bottom-right corner: the card does not move
  await saved(page);
  await shot(page, 'g06-resize');
  const width = () => card.boundingBox().then((b) => b!.width);
  await page.keyboard.press('ControlOrMeta+z'); // undo: default size again
  await expect.poll(width).toBeLessThan(before.width + 10);
  await page.keyboard.press('ControlOrMeta+Shift+z'); // redo
  await expect.poll(width).toBeGreaterThan(before.width + 80);
  await saved(page);

  await page.reload();
  await expect(card).toBeVisible();
  const reloaded = (await card.boundingBox())!;
  expect(Math.abs(reloaded.width - after.width)).toBeLessThan(10);
  expect(Math.abs(reloaded.height - after.height)).toBeLessThan(10);
});

test('2. Conteúdo: criado pela barra, sem virar nem rubrica; fora do desafio', async ({ page, request }) => {
  test.setTimeout(120_000);
  const { headers } = await signUpAndLogin(page, request);
  const id = await board(request, headers, 'Só conteúdo', []);
  await page.goto(`/mapas/${id}`);
  await expect(page.locator('.react-flow__pane')).toBeVisible();
  await page.getByRole('toolbar', { name: 'Ferramentas do mapa' }).getByRole('button', { name: 'Adicionar Conteúdo' }).click();
  await expect(form(page)).toBeVisible();
  await expect(form(page).getByLabel('Resposta', { exact: true })).toHaveCount(0);
  await form(page).getByLabel('Título').fill('Fisiopatologia da sepse');
  await form(page).getByLabel('Texto', { exact: true }).fill('Resposta desregulada do hospedeiro à infecção.');
  await form(page).getByRole('button', { name: 'Salvar' }).click();
  await expect(form(page)).toHaveCount(0);
  const card = node(page, 'Fisiopatologia da sepse');
  await expect(card.locator('article')).toHaveAttribute('data-type', 'note');
  await expect(card.getByText('Resposta desregulada')).toBeVisible();
  await expect(card.getByRole('button', { name: 'Ver resposta' })).toHaveCount(0);
  await expect(panel(page).getByRole('tab', { name: 'Rubrica' })).toHaveCount(0);
  await expect(panel(page).getByRole('button', { name: 'Revisar este card' })).toHaveCount(0);
  await saved(page);
  await shot(page, 'g06-conteudo');

  // only a Conteúdo card on the map: the challenge has nothing to ask
  await page.goto(`/mapas/${id}?modo=desafio`);
  await expect(panel(page).getByRole('heading', { level: 2, name: 'Nada para revisar agora' })).toBeVisible();
  await expect(panel(page).getByRole('button', { name: 'Corrigir resposta' })).toHaveCount(0);
  await expect(panel(page).getByRole('button', { name: 'Revelar resposta' })).toHaveCount(0);
});

test('3. imagem num passo do fluxograma e na resposta: persistem após recarregar; o verso mostra as duas', async ({ page, request }) => {
  test.setTimeout(150_000);
  const { headers } = await signUpAndLogin(page, request);
  const steps = [{ id: 's1', text: 'Colher lactato' }, { id: 's2', text: 'Hemoculturas' }, { id: 's3', text: 'Antibiótico' }];
  const id = await board(request, headers, 'Imagens', [{ title: 'Pacote', type: 'flow', x: 80, y: 120, put: { payload: { steps } } }]);
  await page.goto(`/mapas/${id}`);
  const card = node(page, 'Pacote');
  await card.getByRole('button', { name: 'Selecionar Pacote' }).dblclick();
  await expect(form(page)).toBeVisible();
  await form(page).getByRole('button', { name: 'Adicionar imagem ao passo 2' }).click();
  const file = await png(page);
  await form(page).getByRole('group', { name: 'Imagem do passo 2 (opcional)' }).locator('input[type="file"]').setInputFiles(file);
  await expect(form(page).getByRole('img', { name: 'Imagem do passo 2 de Pacote' })).toBeVisible({ timeout: 30_000 });
  await form(page).getByRole('group', { name: 'Imagem da resposta (opcional)' }).locator('input[type="file"]').setInputFiles(file);
  await expect(form(page).getByRole('img', { name: 'Imagem da resposta de Pacote' })).toBeVisible({ timeout: 30_000 });
  await form(page).getByRole('button', { name: 'Salvar' }).click();
  await expect(form(page)).toHaveCount(0);

  await page.reload();
  await card.getByRole('button', { name: 'Ver resposta' }).click();
  await expect(card.getByRole('img', { name: 'Imagem do passo 2 de Pacote' })).toBeVisible({ timeout: 20_000 });
  await expect(card.getByRole('img', { name: 'Imagem da resposta de Pacote' })).toBeVisible();
  await page.waitForTimeout(500); // the flip (400 ms)
  await shot(page, 'g06-imagens-verso');
  await card.getByRole('button', { name: 'Ver pergunta' }).click();
  await card.getByRole('button', { name: 'Selecionar Pacote' }).first().dblclick();
  await expect(form(page).getByRole('button', { name: 'Remover imagem do passo 2' })).toBeVisible();
  await expect(form(page).getByRole('button', { name: 'Remover imagem da resposta' })).toBeVisible();
});

test('4. caso clínico: a etapa explica o que é por tooltip, pelo teclado; painel abre (open) e fecha (closed) com animação', async ({ page, request }) => {
  test.setTimeout(120_000);
  const { headers } = await signUpAndLogin(page, request);
  const caseSteps = [{ stage: 'presentation', text: 'Febre e confusão' }, { stage: 'workup', text: 'Lactato 4' }];
  const id = await board(request, headers, 'Caso', [{ title: 'Caso sepse', type: 'case', x: 80, y: 120, put: { payload: { caseSteps } } }]);
  await page.goto(`/mapas/${id}`);
  const card = node(page, 'Caso sepse');
  await expect(card).toBeVisible();
  await card.getByRole('button', { name: 'Selecionar Caso sepse' }).focus();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab'); // the second stage of the trail: Exames
  await expect(card.getByRole('button', { name: /Exames/ })).toBeFocused();
  await expect(page.getByRole('tooltip')).toContainText('pergunta os exames');
  await expect(card.getByRole('button', { name: /Exames/ })).toHaveAttribute('data-filled', 'true');
  await expect(card.getByRole('button', { name: /Diagnóstico/ })).toHaveAttribute('data-filled', 'false');
  await shot(page, 'g06-caso-tooltip');

  await page.keyboard.press('Enter'); // a stage button selects the card
  const aside = page.locator('aside.cv-panel');
  await expect(aside).toHaveAttribute('data-state', 'open');
  await expect(panel(page).getByRole('heading', { level: 2, name: 'Caso sepse' })).toBeFocused(); // focus lands once it has opened
  await panel(page).getByRole('button', { name: 'O que é Diagnóstico?' }).focus();
  await expect(page.getByRole('tooltip')).toContainText('pergunta o diagnóstico');
  await page.keyboard.press('Escape'); // closes the tooltip
  await page.locator('.react-flow__pane').click({ position: { x: 700, y: 600 } });
  await expect(aside).toHaveAttribute('data-state', 'closed');
  await expect(aside).toHaveCount(0);
});

test('5. desafio: no modo Falar o botão de gravar fica desabilitado com "Em breve"', async ({ page, request }) => {
  test.setTimeout(120_000);
  const { userId, headers } = await signUpAndLogin(page, request);
  const sepse = await createMockSepse(request, headers, userId);
  await page.goto(`/mapas/${sepse}?modo=desafio`);
  await expect(page.getByRole('button', { name: 'Corrigir resposta' })).toBeVisible();
  await page.getByRole('group', { name: 'Como responder' }).getByRole('button', { name: 'Falar' }).click();
  const rec = page.getByRole('button', { name: 'Falar a resposta' });
  await expect(rec).toHaveAttribute('aria-disabled', 'true');
  await expect(panel(page).getByText('Em breve', { exact: true })).toBeVisible();
  await rec.click({ force: true });
  await expect(page.getByLabel('Sua resposta')).toHaveCount(0); // nothing transcribed, still in Falar
  await shot(page, 'g06-falar-em-breve');
});
