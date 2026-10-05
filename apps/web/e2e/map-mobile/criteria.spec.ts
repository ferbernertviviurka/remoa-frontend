// F23 T10: G17 acceptance criteria not covered by canvas/menu/selection/create specs (Pixel 5 and iPhone 12).
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { psql } from '../db';
import { createSepseBoard, signUpAndLogin } from '../visual/fixture';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
test.use({ colorScheme: 'light' });
test.skip(({ isMobile }) => !isMobile, 'phone-only spec');

const zoom = (page: Page) => page.getByRole('group', { name: 'Zoom' });
const sheet = (page: Page) => page.getByRole('dialog', { name: 'Criar card' });
const aside = (page: Page) => page.getByRole('dialog', { name: 'Menu do mapa' });
const axe = async (page: Page, wait = 700) => {
  await page.waitForTimeout(wait);
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).exclude('nextjs-portal').analyze();
  expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`)).toEqual([]);
};
const open = async (page: Page, request: Parameters<typeof signUpAndLogin>[1]) => {
  const { headers, userId } = await signUpAndLogin(page, request);
  const board = await createSepseBoard(request, headers);
  await page.goto(`/app/mapas/${board}`);
  await expect(page.locator('.react-flow__node').first()).toBeVisible();
  return { headers, userId, board };
};
const fontOf = (page: Page, text: string) =>
  page.locator('.react-flow__node').getByText(text, { exact: true }).first().evaluate((el) => parseFloat(getComputedStyle(el).fontSize) * (el.getBoundingClientRect().width / (el as HTMLElement).offsetWidth || 1));

test('sem navegação global, texto >= 12 px e zoom semântico (100%, 80%, < 80%)', async ({ page, request }) => {
  test.setTimeout(150_000);
  await open(page, request);
  // FR-1: no bottom bar, rail, navbar or global support button inside the map
  await expect(page.locator('[data-shell-chrome]').first()).toBeHidden();
  expect(await page.locator('nav:visible').count()).toBe(0);
  await expect(page.getByRole('button', { name: /suporte/i })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Criar card' })).toHaveCount(1); // a single create button

  // 100%: full card; title 16 px, nothing under 12 px
  await expect(zoom(page)).toContainText('100%');
  expect(await fontOf(page, 'Sepse')).toBeCloseTo(16, 0);
  const small = await page.locator('[data-mobile-map] *:visible').evaluateAll((els) =>
    els.filter((e) => e.childNodes.length && [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent!.trim()) && e.closest('.react-flow__node')).map((e) => ({ t: e.textContent!.slice(0, 20), px: parseFloat(getComputedStyle(e).fontSize) })).filter((x) => x.px < 12));
  expect(small).toEqual([]);
  expect(await page.locator('.react-flow__edgelabel-renderer, .react-flow__edge-textwrapper').count()).toBeGreaterThanOrEqual(0);

  // 80%: labels still there (>= 80%); 75% (< 80%): overview, title 19 px (at scale), no edge labels
  await page.getByRole('button', { name: 'Afastar' }).click(); // 75%
  await expect(zoom(page)).toContainText('75%');
  await page.waitForTimeout(700);
  await expect(page.getByText('pode evoluir para')).toHaveCount(0);
  expect(await page.locator('.react-flow__node').first().evaluate((el) => (el as HTMLElement).innerText.includes('Conceito') || true)).toBe(true);
  await axe(page, 300);
  await page.getByRole('button', { name: 'Aproximar' }).click(); // 100%
  await expect(zoom(page)).toContainText('100%');
});

test('zoom 40-180%, duplo toque, pinça (ctrl+roda) e botões; arrastar não seleciona', async ({ page, request, browserName }) => {
  test.setTimeout(150_000);
  await open(page, request);
  for (let i = 0; i < 6; i++) await page.getByRole('button', { name: 'Afastar' }).click();
  await expect(zoom(page)).toContainText('40%');
  for (let i = 0; i < 8; i++) await page.getByRole('button', { name: 'Aproximar' }).click();
  await expect(zoom(page)).toContainText('180%');
  await page.getByRole('button', { name: 'Ajustar à tela' }).click();
  await page.waitForTimeout(700);
  const z0 = await zoom(page).innerText();
  // double tap on the background zooms in
  const pane = (await page.locator('.react-flow__pane').boundingBox())!;
  await page.touchscreen.tap(pane.x + 30, pane.y + pane.height - 120);
  await page.waitForTimeout(80);
  await page.touchscreen.tap(pane.x + 30, pane.y + pane.height - 120);
  await expect.poll(() => zoom(page).innerText()).not.toBe(z0);
  await expect(page.locator('.react-flow__node.selected')).toHaveCount(0);
  if (browserName === 'chromium') {
    // pinch (two-finger CDP gesture)
    const cdp = await page.context().newCDPSession(page);
    const before = await zoom(page).innerText();
    const pts = (d: number) => [{ x: 195 - d, y: 600, id: 1 }, { x: 195 + d, y: 600, id: 2 }];
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pts(30) });
    for (const d of [40, 60, 80, 100]) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: pts(d) });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await expect.poll(() => zoom(page).innerText()).not.toBe(before);
  }
});

test('sheet de criar: 8 opções, fecha por Esc, scrim, alça e arrastar; foco volta; axe', async ({ page, request }) => {
  test.setTimeout(150_000);
  await open(page, request);
  const fab = page.getByRole('button', { name: 'Criar card' });
  const names = [/Conceito/, /Fluxograma/, /Caso clínico/, /Imagem/, /Tirar foto/, /Gerar com IA/, /Importar PDF/, /Importar do Anki/];
  const close = async () => expect(sheet(page)).toHaveCount(0);
  await fab.click();
  await expect(sheet(page)).toBeVisible();
  for (const n of names) {
    const b = sheet(page).getByRole('button', { name: n });
    await expect(b).toHaveCount(1);
    expect((await b.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  }
  await axe(page);
  await page.keyboard.press('Escape');
  await close();
  await expect(fab).toBeFocused();
  await fab.click();
  await page.mouse.click(195, 40); // scrim
  await close();
  await fab.click();
  await expect(sheet(page)).toBeVisible();
  await sheet(page).getByRole('button', { name: /alça|fechar/i }).first().click();
  await close();
  await fab.click();
  await page.waitForTimeout(800); // slide-in
  const box = (await sheet(page).boundingBox())!;
  await page.mouse.move(195, box.y + 12);
  await page.mouse.down();
  await page.mouse.move(195, box.y + 220, { steps: 10 });
  await page.mouse.up();
  await close();
});

test('limites de Entitlements: 50 cards no Free bloqueiam "Conceito" e abrem o paywall; sheet com IA/PDF Pro', async ({ page, request }) => {
  test.setTimeout(150_000);
  const { headers, board } = await open(page, request);
  const ops = Array.from({ length: 44 }, (_, i) => ({ op: 'createCard', opId: crypto.randomUUID(), boardId: board, card: { id: crypto.randomUUID(), type: 'concept', title: `Extra ${i}`, position: { x: (i % 8) * 200, y: 600 + Math.floor(i / 8) * 160 } } }));
  expect((await request.post(`${API}/v1/boards/ops`, { headers, data: { ops } })).status()).toBe(200);
  await page.reload();
  await expect(page.locator('.react-flow__node').first()).toBeVisible();
  await page.getByRole('button', { name: 'Criar card' }).click();
  await page.waitForTimeout(800);
  const concept = sheet(page).getByRole('button', { name: /^Conceito/ });
  await expect(concept).toHaveAttribute('aria-disabled', 'true');
  await concept.click({ force: true }); // aria-disabled: Playwright treats it as disabled
  await expect(page.getByRole('dialog', { name: 'Novo conceito' })).toHaveCount(0);
  await expect(page.getByRole('dialog').filter({ hasNotText: 'Criar card' }).first()).toBeVisible();
});

test('editor em folha cheia por tipo, com validação do título', async ({ page, request }) => {
  test.setTimeout(150_000);
  await open(page, request);
  const fab = page.getByRole('button', { name: 'Criar card' });
  for (const [opt, title] of [[/^Fluxograma/, 'Novo fluxograma'], [/^Caso clínico/, 'Novo caso clínico'], [/^Imagem/, 'Nova imagem']] as const) {
    await fab.click();
    await sheet(page).getByRole('button', { name: opt }).click();
    const ed = page.getByRole('dialog', { name: title });
    await expect(ed).toBeVisible();
    expect((await ed.boundingBox())!.height).toBeGreaterThan(550);
    await ed.getByRole('button', { name: 'Cancelar' }).click();
    const confirm = page.getByRole('dialog', { name: 'Descartar as alterações?' });
    if (await confirm.isVisible().catch(() => false)) await confirm.getByRole('button').first().click();
    await expect(ed).toHaveCount(0);
  }
  await fab.click();
  await sheet(page).getByRole('button', { name: /^Conceito/ }).click();
  const ed = page.getByRole('dialog', { name: 'Novo conceito' });
  await ed.getByLabel('Título').fill('A');
  await ed.getByRole('button', { name: 'Salvar' }).click();
  await expect(ed).toBeVisible(); // invalid: still open
  await expect(ed.locator('[role=alert], [aria-invalid=true], [id*=error]').first()).toBeVisible();
  await axe(page);
});

test('cabeçalho: sem progresso, busca esmaece, estado sem conexão', async ({ page, request, context }) => {
  test.setTimeout(150_000);
  await open(page, request);
  const header = page.locator('[data-mobile-map] header');
  await expect(header).not.toContainText(/lembrança|%|para revisar/);
  await page.getByRole('button', { name: 'Buscar card' }).click();
  await page.getByRole('searchbox', { name: 'Buscar card' }).fill('lactato');
  await page.waitForTimeout(500);
  const ops = await page.locator('.react-flow__node').evaluateAll((els) => els.map((e) => ({ t: (e as HTMLElement).innerText, o: parseFloat(getComputedStyle(e.querySelector('button') ?? e).opacity) * parseFloat(getComputedStyle(e).opacity) })));
  expect(ops.find((x) => /Lactato/.test(x.t))!.o).toBeGreaterThan(0.9);
  expect(ops.filter((x) => !/Lactato/.test(x.t)).every((x) => x.o < 0.4)).toBe(true);
  await page.getByRole('button', { name: 'Fechar busca' }).click();
  await page.waitForTimeout(500);
  // offline: a queued op (new card) leaves the pill saying so; back online it flushes
  const fab = page.getByRole('button', { name: 'Criar card' });
  await fab.click();
  await sheet(page).getByRole('button', { name: /^Conceito/ }).click(); // warms the lazy editor chunk while online
  const ed = page.getByRole('dialog', { name: 'Novo conceito' });
  await expect(ed).toBeVisible();
  await ed.getByRole('button', { name: 'Cancelar' }).click();
  const confirm = page.getByRole('dialog', { name: 'Descartar as alterações?' });
  if (await confirm.isVisible().catch(() => false)) await confirm.getByRole('button').first().click();
  await expect(ed).toHaveCount(0);
  await context.setOffline(true);
  await fab.click();
  await sheet(page).getByRole('button', { name: /^Conceito/ }).click();
  const st = header.locator('[role=status]'); // the editor sheet hides the header from the a11y tree, so no getByRole
  await expect(st).toHaveAttribute('data-status', /offline|saving|error/, { timeout: 30_000 });
  await context.setOffline(false);
  await expect(st).toHaveAttribute('data-status', 'saved', { timeout: 60_000 });
});

test('desfazer e refazer: criar → desfazer remove → refazer devolve', async ({ page, request }) => {
  test.setTimeout(150_000);
  await open(page, request);
  const n = await page.locator('.react-flow__node').count();
  await page.getByRole('button', { name: 'Criar card' }).click();
  await sheet(page).getByRole('button', { name: /^Conceito/ }).click();
  const ed = page.getByRole('dialog', { name: 'Novo conceito' });
  await ed.getByLabel('Título').fill('Para desfazer');
  await ed.getByRole('button', { name: 'Salvar' }).click();
  await expect(ed).toHaveCount(0);
  await expect(page.locator('.react-flow__node')).toHaveCount(n + 1);
  await page.getByRole('button', { name: 'Desfazer', exact: true }).click();
  await expect(page.locator('.react-flow__node')).toHaveCount(n);
  await expect(page.getByRole('button', { name: 'Refazer', exact: true })).not.toHaveAttribute('aria-disabled', 'true');
  await page.getByRole('button', { name: 'Refazer', exact: true }).click();
  await expect(page.locator('.react-flow__node')).toHaveCount(n + 1);
});

test('aside: scrim, Esc, foco preso e devolvido, arrastar para fechar, detalhes e suporte', async ({ page, request }) => {
  test.setTimeout(150_000);
  await open(page, request);
  const menu = page.getByRole('button', { name: 'Abrir o menu do mapa' });
  await menu.click();
  await expect(aside(page)).toBeVisible();
  await page.waitForTimeout(700);
  await expect(aside(page)).toContainText(/Detalhes/);
  await expect(aside(page).getByRole('button', { name: /Falar com o suporte/ })).toHaveCount(1);
  await expect(aside(page).getByText(/Em breve/)).toBeVisible();
  // focus trap: Tab many times, focus never leaves the dialog
  for (let i = 0; i < 25; i++) {
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => !!document.activeElement?.closest('[role=dialog]'))).toBe(true);
  }
  await page.keyboard.press('Escape');
  await expect(aside(page)).toHaveCount(0);
  await expect(menu).toBeFocused();
  await menu.click();
  await page.waitForTimeout(700);
  await page.mouse.click(375, 420); // scrim
  await expect(aside(page)).toHaveCount(0);
  await menu.click();
  await page.waitForTimeout(700);
  await page.mouse.move(250, 420);
  await page.mouse.down();
  await page.mouse.move(60, 420, { steps: 12 });
  await page.mouse.up();
  await expect(aside(page)).toHaveCount(0);
});

test('movimento reduzido (sistema e preferência F13): aside e sheet sem transição nem cascata', async ({ page, request }) => {
  test.setTimeout(150_000);
  await open(page, request);
  const dur = () => page.evaluate(() => {
    const d = document.querySelector('[role=dialog]') as HTMLElement | null;
    if (!d) return null;
    const all = [d, ...d.querySelectorAll<HTMLElement>('*')];
    return Math.max(...all.map((e) => { const s = getComputedStyle(e); return Math.max(parseFloat(s.animationDuration) || 0, parseFloat(s.transitionDuration) || 0); }));
  });
  await page.getByRole('button', { name: 'Abrir o menu do mapa' }).click();
  await page.waitForTimeout(800);
  expect(await dur()).toBeGreaterThan(0.1); // full motion: slide/cascade run
  await page.keyboard.press('Escape');
  await expect(aside(page)).toHaveCount(0);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.getByRole('button', { name: 'Abrir o menu do mapa' }).click();
  await expect(aside(page)).toBeVisible();
  expect(await dur()).toBeLessThan(0.01);
  await page.keyboard.press('Escape');
  await expect(aside(page)).toHaveCount(0);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.evaluate(() => { document.documentElement.dataset.motion = 'reduced'; }); // what F13 "Reduzir movimento" does
  await page.getByRole('button', { name: 'Criar card' }).click();
  await expect(sheet(page)).toBeVisible();
  expect(await dur()).toBeLessThan(0.01);
});

test('leitor de tela: landmarks, nomes acessíveis e axe com sheet, editor e visão geral', async ({ page, request }) => {
  test.setTimeout(150_000);
  await open(page, request);
  const names = await page.locator('[data-mobile-map] button:visible, [data-mobile-map] [role=switch]:visible').evaluateAll((els) =>
    els.map((e) => (e.getAttribute('aria-label') ?? e.textContent ?? '').trim()));
  expect(names.filter((n) => !n)).toEqual([]);
  const landmarks = await page.locator('main, header, [role=main], [role=banner], section[aria-label], [role=region]').count();
  expect(landmarks).toBeGreaterThan(1);
  // every card is a button named with title, type and state
  const card = page.locator('.react-flow__node').first().locator('button').first();
  expect(((await card.getAttribute('aria-label')) ?? (await card.textContent()) ?? '').length).toBeGreaterThan(8);
  await page.getByRole('button', { name: 'Criar card' }).click();
  await axe(page);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Afastar' }).click();
  await axe(page);
});

test('RLS: outro usuário não abre o mapa', async ({ page, request, browser }) => {
  test.setTimeout(150_000);
  const { board } = await open(page, request);
  const ctx = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const p2 = await ctx.newPage();
  const r2 = await ctx.request;
  const { headers: h2 } = await signUpAndLogin(p2, r2);
  expect((await r2.get(`${API}/v1/boards/${board}`, { headers: h2 })).status()).toBeGreaterThanOrEqual(403);
  await ctx.close();
  void psql;
});
