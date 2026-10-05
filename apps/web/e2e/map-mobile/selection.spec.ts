// F23 T6 (Pixel 5 and iPhone 12): peek, hold to move, connect by touch and the label field, cancel, undo.
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { createSepseBoard, signUpAndLogin } from '../visual/fixture';

test.use({ colorScheme: 'light' });
test.skip(({ isMobile }) => !isMobile, 'phone-only spec');

const node = (page: Page, n: number) => page.locator('.react-flow__node').nth(n);
const peek = (page: Page) => page.getByRole('region', { name: 'Card selecionado' });
const undo = (page: Page) => page.getByRole('button', { name: 'Desfazer' });

test('peek, conectar por toque com rótulo, recusas, cancelar e desfazer', async ({ page, request }) => {
  test.setTimeout(150_000);
  const { headers } = await signUpAndLogin(page, request);
  const board = await createSepseBoard(request, headers);
  await page.goto(`/app/mapas/${board}`);
  await expect(node(page, 0)).toBeVisible();

  // FR-8: tap → peek with the three actions (≥ 44 px); the X closes it
  await node(page, 0).locator('button').first().tap();
  await expect(peek(page)).toBeVisible();
  await page.waitForTimeout(600); // `pop` (400 ms) scales the card in: measure after it
  for (const name of ['Revisar este conceito', 'Editar card', 'Conectar a outro card', 'Fechar']) {
    const b = peek(page).getByRole('button', { name });
    await expect(b).toBeVisible();
    const box = (await b.boundingBox())!;
    expect(Math.min(box.width, box.height), name).toBeGreaterThanOrEqual(44);
  }
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).exclude('nextjs-portal').analyze();
  expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`)).toEqual([]);
  await peek(page).getByRole('button', { name: 'Fechar' }).tap();
  await expect(peek(page)).toHaveCount(0);

  // FR-10: Conectar → amber strip; cancel
  await node(page, 0).locator('button').first().tap();
  await peek(page).getByRole('button', { name: 'Conectar a outro card' }).tap();
  await expect(page.getByText(/Toque no card que se liga a/)).toBeVisible();
  await page.getByRole('button', { name: 'Cancelar conexão' }).tap();
  await expect(page.getByText(/Toque no card que se liga a/)).toHaveCount(0);

  // tapping itself is refused with a notice; the mode stays
  await peek(page).getByRole('button', { name: 'Conectar a outro card' }).tap();
  await page.getByRole('button', { name: 'Ajustar à tela' }).tap(); // every card on screen
  await page.waitForTimeout(700);
  await node(page, 0).locator('button').first().tap({ force: true });
  await expect(page.getByText('Escolha outro card para conectar.')).toBeVisible();

  // the destination: the connection is created and the label field opens; "Pular" leaves it flagged; undo removes it
  const edges = page.locator('.react-flow__edge');
  const before = await edges.count();
  let created = false;
  for (let i = 1; i < (await page.locator('.react-flow__node').count()) && !created; i++) {
    await node(page, i).locator('button').first().tap({ force: true });
    const field = page.getByRole('textbox', { name: 'Rótulo (pergunta)' });
    if (await field.isVisible().catch(() => false)) created = true;
    else await page.getByText('Esses dois cards já estão conectados.').waitFor({ state: 'hidden', timeout: 6000 }).catch(() => undefined);
  }
  expect(created).toBe(true);
  await expect(edges).toHaveCount(before + 1);
  await page.getByRole('textbox', { name: 'Rótulo (pergunta)' }).fill('gera o quadro');
  await page.getByRole('button', { name: 'Salvar' }).tap();
  // labels only show from 80% (FR-6): zoom in until they do
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Aproximar' }).tap();
  await expect(page.getByRole('button', { name: /gera o quadro/ })).toHaveCount(1);
  // the label is its own undo step, then the edge itself
  await undo(page).tap();
  await expect(edges).toHaveCount(before + 1);
  await undo(page).tap();
  await expect(edges).toHaveCount(before);
});

test('segurar 250 ms move o card (snap 8 px) e desfazer devolve', async ({ page, request, browserName }) => {
  test.skip(browserName !== 'chromium', 'CDP touch events (Pixel 5)');
  test.setTimeout(120_000);
  const { headers } = await signUpAndLogin(page, request);
  const board = await createSepseBoard(request, headers);
  await page.goto(`/app/mapas/${board}`);
  await expect(node(page, 0)).toBeVisible();
  const n = node(page, 0);
  const pos = () => n.evaluate((el) => (el as HTMLElement).style.transform);
  const before = await pos();
  const box = (await n.boundingBox())!;
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  const cdp = await page.context().newCDPSession(page);
  const touch = (type: 'touchStart' | 'touchMove' | 'touchEnd', px: number, py: number) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x: px, y: py }] });
  await touch('touchStart', x, y);
  await page.waitForTimeout(400);
  await touch('touchMove', x + 20, y + 20);
  await touch('touchMove', x + 60, y + 40);
  await touch('touchEnd', x + 60, y + 40);
  await expect.poll(pos).not.toBe(before);
  await expect(n).toHaveClass(/selected/);
  const m = /translate\((-?[\d.]+)px, (-?[\d.]+)px\)/.exec(await pos())!;
  expect(Number(m[1]) % 8).toBe(0);
  expect(Number(m[2]) % 8).toBe(0);
  await expect(undo(page)).not.toHaveAttribute('aria-disabled', 'true');
  await undo(page).tap();
  await expect.poll(pos).toBe(before);
});
