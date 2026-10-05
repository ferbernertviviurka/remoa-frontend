// G04 / E4: arrastar cards (persistência), formato em tempo real no editor e botão "Pular" visível no desafio.
// SHOTS=<dir> salva os screenshots do relatório (antes/depois).
import { expect, test, type Page } from '@playwright/test';
import { createMockSepse, createSepseBoard, signUpAndLogin } from './visual/fixture';
import { padForChallenge } from './challenge-pad';

const node = (page: Page, title: string) =>
  page.locator('.react-flow__node').filter({ has: page.getByRole('button', { name: `Selecionar ${title}`, exact: true }) });
const xy = (page: Page, title: string) =>
  node(page, title).evaluate((el) => {
    const m = new DOMMatrix(getComputedStyle(el).transform);
    return { x: m.e, y: m.f };
  });
const shot = (page: Page, name: string) => (process.env.SHOTS ? page.screenshot({ path: `${process.env.SHOTS}/${name}.png` }) : undefined);

test.use({ viewport: { width: 1440, height: 900 }, colorScheme: 'light' });

test('arrastar 3 cards (centro, borda, canto; mouse e arraste rápido) e recarregar mantém as posições', async ({ page, request }) => {
  test.setTimeout(120_000);
  const { headers } = await signUpAndLogin(page, request);
  const board = await createSepseBoard(request, headers);
  await page.goto(`/app/mapas/${board}`);
  await expect(page.locator('.react-flow__node')).toHaveCount(6);
  await page.waitForTimeout(800); // fitView
  const k = await page.locator('.react-flow__viewport').evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).a);

  // [title, grab point as a fraction of the card, steps]: 1-2 steps = a fast flick (or moves coalesced on a busy frame)
  const drags = [['Sepse', 0.5, 0.5, 12], ['Lactato', 0.06, 0.5, 2], ['Disfunção orgânica', 0.94, 0.08, 1]] as const;
  const want: Record<string, { x: number; y: number }> = {};
  for (const [title, fx, fy, steps] of drags) {
    await page.keyboard.press('Escape'); // panel closed: it must not cover the next card
    const b = (await node(page, title).boundingBox())!;
    const x = b.x + b.width * fx;
    const y = b.y + b.height * fy;
    // the card reads as draggable: grab cursor on the button that covers it
    expect(await page.evaluate(([px, py]) => getComputedStyle(document.elementFromPoint(px!, py!)!).cursor, [x, y])).toBe('grab');
    const before = await xy(page, title);
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + 80, y + 48, { steps });
    await page.mouse.up();
    // follows the pointer (within the 8 px grid snap): no lost first segment (it used to stay put on a 1-step drag)
    const off = async () => {
      const p = await xy(page, title);
      return Math.max(Math.abs(p.x - before.x - 80 / k), Math.abs(p.y - before.y - 48 / k));
    };
    await expect.poll(off).toBeLessThanOrEqual(8);
    want[title] = await xy(page, title);
  }
  await expect(page.locator('form[aria-label^="Editar"]')).toHaveCount(0); // a drag never opens the editor
  await expect(page.getByText(/Salvo/).first()).toBeVisible();
  await page.waitForTimeout(500);
  await page.reload();
  await expect(page.locator('.react-flow__node')).toHaveCount(6);
  for (const title of Object.keys(want)) expect(await xy(page, title)).toEqual(want[title]);
});

test('clicar e logo arrastar (ou tocar-e-arrastar no trackpad) move o card e não abre o editor; duplo clique ainda edita', async ({ page, request }) => {
  test.setTimeout(120_000);
  const { headers } = await signUpAndLogin(page, request);
  const board = await createSepseBoard(request, headers);
  await page.goto(`/app/mapas/${board}`);
  await expect(page.locator('.react-flow__node')).toHaveCount(6);
  await page.waitForTimeout(800);
  const b = (await node(page, 'Choque séptico').boundingBox())!;
  const x = b.x + b.width / 2;
  const y = b.y + b.height / 2;
  const before = await xy(page, 'Choque séptico');
  await page.mouse.click(x, y);
  await page.mouse.down({ clickCount: 2 });
  await page.mouse.move(x + 64, y + 40, { steps: 6 });
  await page.mouse.up({ clickCount: 2 });
  await expect.poll(async () => (await xy(page, 'Choque séptico')).x).toBeGreaterThan(before.x);
  await page.waitForTimeout(300);
  const editor = page.getByRole('form', { name: /Choque séptico/ });
  await expect(editor).toHaveCount(0);
  await expect(page.getByRole('complementary', { name: 'Painel do mapa' })).toBeVisible(); // selected
  await page.waitForTimeout(600);
  await node(page, 'Choque séptico').dblclick();
  await expect(editor).toBeVisible();
});

test('formato: o nó muda na hora, grava sem "Salvar", Cancelar não desfaz e recarregar mantém', async ({ page, request }) => {
  test.setTimeout(120_000);
  const { headers } = await signUpAndLogin(page, request);
  const board = await createSepseBoard(request, headers);
  await page.goto(`/app/mapas/${board}`);
  await expect(page.locator('.react-flow__node')).toHaveCount(6);
  await page.waitForTimeout(800);
  await node(page, 'Lactato').dblclick();
  const form = page.getByRole('form', { name: /Lactato/ });
  await expect(form).toBeVisible();
  await form.getByLabel('Título').fill('Lactato alterado sem salvar');
  const puts: string[] = [];
  page.on('request', (r) => r.method() === 'PUT' && /\/v1\/cards\//.test(r.url()) && puts.push(r.postData() ?? ''));
  const before = (await node(page, 'Lactato').boundingBox())!.height; // G14 D-607: the navbar on the editor changes the fit zoom
  await form.getByRole('group', { name: 'Formato no mapa' }).getByRole('button', { name: 'Losango' }).click();
  // preview at once, before any response: data-shape and the React Flow measured size (edges follow it)
  const article = node(page, 'Lactato').locator('article');
  await expect(article).toHaveAttribute('data-shape', 'diamond');
  await expect.poll(async () => (await node(page, 'Lactato').boundingBox())?.height ?? 0).toBeGreaterThan(before * 1.2);
  await expect(form.getByRole('status').filter({ hasText: 'Formato salvo.' })).toBeVisible();
  expect(puts).toHaveLength(1);
  expect(JSON.parse(puts[0]!)).toMatchObject({ shape: 'diamond', title: 'Lactato' }); // the unsaved title stays out
  await shot(page, 'formato-depois');
  await form.getByRole('button', { name: 'Cancelar' }).click();
  await expect(form).toHaveCount(0);
  await expect(article).toHaveAttribute('data-shape', 'diamond');
  await page.reload();
  await expect(node(page, 'Lactato').locator('article')).toHaveAttribute('data-shape', 'diamond');
  await expect(page.getByRole('button', { name: 'Selecionar Lactato alterado sem salvar' })).toHaveCount(0);

  // a failed save rolls the node back to the saved shape
  await node(page, 'Lactato').dblclick();
  const form2 = page.getByRole('form', { name: /Lactato/ });
  await page.route(/\/v1\/cards\/[0-9a-f-]{36}$/, (r) => (r.request().method() === 'PUT' ? r.fulfill({ status: 500, body: '{}' }) : r.continue()));
  await form2.getByRole('group', { name: 'Formato no mapa' }).getByRole('button', { name: 'Círculo' }).click();
  await expect(form2.getByRole('status').filter({ hasText: 'Não deu para salvar o formato' })).toBeVisible();
  await expect(node(page, 'Lactato').locator('article')).toHaveAttribute('data-shape', 'diamond');
  await expect(form2.getByRole('button', { name: 'Losango' })).toHaveAttribute('aria-pressed', 'true');
});

test('desafio: "Pular" é um botão com borda e fundo, contraste ≥ 4,5:1 e alvo ≥ 44 px', async ({ page, request }) => {
  test.setTimeout(120_000);
  const { userId, headers } = await signUpAndLogin(page, request);
  const board = await createMockSepse(request, headers, userId);
  await padForChallenge(request, headers, board, 4); // G14 D-579: 10 cards to challenge
  await page.goto(`/app/mapas/${board}?modo=desafio`);
  const skip = page.getByRole('button', { name: 'Pular', exact: true });
  await expect(skip).toBeVisible();
  await expect(skip).toBeEnabled();
  const s = await skip.evaluate((el) => {
    const c = getComputedStyle(el);
    return { border: c.borderTopWidth, borderColor: c.borderTopColor, bg: c.backgroundColor, color: c.color, h: el.getBoundingClientRect().height };
  });
  expect(parseFloat(s.border)).toBeGreaterThanOrEqual(1);
  expect(s.borderColor).not.toMatch(/rgba\(0, 0, 0, 0\)|transparent/);
  expect(s.bg).not.toMatch(/rgba\(0, 0, 0, 0\)|transparent/);
  expect(s.h).toBeGreaterThanOrEqual(44);
  const lum = (rgb: string) => {
    const [r, g, b] = rgb.match(/[\d.]+/g)!.slice(0, 3).map((v) => {
      const c = Number(v) / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
  };
  const [hi, lo] = [lum(s.color), lum(s.bg)].sort((a, b) => b - a);
  expect((hi! + 0.05) / (lo! + 0.05)).toBeGreaterThanOrEqual(4.5);
  await shot(page, 'pular-depois');
});
