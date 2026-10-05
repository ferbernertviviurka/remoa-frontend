// F23 T5: the phone map (Pixel 5 and iPhone 12, playwright.config.ts). Same route as the desktop editor, full screen, no shell chrome.
// PERF=1 adds 150 cards at 60 fps and the route in < 2 s on simulated 4G (indicative headless numbers; confirm on a real phone).
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { padForChallenge } from '../challenge-pad';
import { psql } from '../db';
import { createSepseBoard, signUpAndLogin } from '../visual/fixture';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

test.use({ colorScheme: 'light' });
test.skip(({ isMobile }) => !isMobile, 'phone-only spec');

const zoomText = (page: Page) => page.getByRole('group', { name: 'Zoom' });
const viewport = (page: Page) => page.locator('.react-flow__viewport').getAttribute('style');

test('mapa no celular: tela cheia, cabeçalho, zoom, pan, vista salva, lista, aside, revisar e axe', async ({ page, request }) => {
  test.setTimeout(180_000);
  const { headers } = await signUpAndLogin(page, request);
  const board = await createSepseBoard(request, headers);
  await page.goto(`/app/mapas/${board}`);
  const map = page.locator('[data-mobile-map]');
  await expect(map).toBeVisible();
  await expect(page.locator('.react-flow__node').first()).toBeVisible();

  // FR-1: no shell chrome inside the map
  await expect(page.locator('[data-shell-chrome]').first()).toBeHidden();
  await expect(page.getByRole('button', { name: /suporte/i })).toHaveCount(0);

  // FR-2: pill header with the save state; FR-4/FR-11 pills
  const header = map.locator('header');
  await expect(header).toContainText('Sepse');
  await expect(header.getByRole('status')).toContainText(/Salvo/);
  await expect(page.getByRole('button', { name: 'Desfazer' })).toHaveAttribute('aria-disabled', 'true');
  await expect(zoomText(page)).toContainText('100%');
  for (const b of await map.locator('header button, [role=group] button').all()) {
    const box = await b.boundingBox();
    if (box && (await b.isVisible())) expect(Math.min(box.width, box.height), (await b.getAttribute('aria-label')) ?? '').toBeGreaterThanOrEqual(44);
  }

  // zoom buttons: 25% steps
  await page.getByRole('button', { name: 'Aproximar' }).click();
  await expect(zoomText(page)).toContainText('125%');
  await page.getByRole('button', { name: 'Afastar' }).click();
  await page.getByRole('button', { name: 'Afastar' }).click();
  await expect(zoomText(page)).toContainText('75%');

  // pan with one finger on the background: the map moves, nothing gets selected (6 px threshold)
  const before = await viewport(page);
  const pane = (await page.locator('.react-flow__pane').boundingBox())!;
  const y = pane.y + pane.height - 160;
  await page.mouse.move(pane.x + 40, y);
  await page.mouse.down();
  await page.mouse.move(pane.x + 140, y - 60, { steps: 8 });
  await page.mouse.up();
  await expect.poll(() => viewport(page)).not.toBe(before);
  await expect(page.locator('.react-flow__node.selected')).toHaveCount(0);

  // the last view of this map survives a reload (D-664)
  await page.waitForTimeout(600); // prefs write is debounced
  const kept = await viewport(page);
  await page.reload();
  await expect(page.locator('.react-flow__node').first()).toBeVisible();
  await expect(zoomText(page)).toContainText('75%');
  expect(await viewport(page)).toBe(kept);

  // FR-3: search swaps the title for a field; closing restores it
  await page.getByRole('button', { name: 'Buscar card' }).click();
  await page.getByRole('searchbox', { name: 'Buscar card' }).fill('lactato');
  await page.getByRole('button', { name: 'Fechar busca' }).click();
  await expect(header).toContainText('Sepse');

  // lista (T8 replaces the placeholder) and back
  await page.getByRole('button', { name: 'Mostrar cards em lista' }).click();
  await expect(page.locator('.react-flow')).toHaveCount(0);
  await page.getByRole('button', { name: 'Voltar ao mapa' }).click();
  await expect(page.locator('.react-flow')).toHaveCount(1);

  // hamburger → aside; Esc closes and focus returns
  await page.getByRole('button', { name: 'Abrir o menu do mapa' }).click();
  await expect(page.getByRole('dialog', { name: 'Menu do mapa' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Menu do mapa' })).toHaveCount(0);

  // axe (WCAG 2.x A/AA) on the canvas
  await page.waitForTimeout(500);
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).exclude('nextjs-portal').analyze();
  expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`)).toEqual([]);

  // FR-12/FR-19: Revisar opens this map's session (10 challengeable cards needed, D-579)
  await padForChallenge(request, headers, board, 4);
  await page.reload();
  await page.getByRole('button', { name: /^Revisar este mapa/ }).click();
  await expect(page).toHaveURL(/\?modo=desafio$/);
  await expect(page.locator('[data-mobile-map]')).toHaveCount(0);
});

test.describe('desempenho (PERF=1)', () => {
  test.skip(!process.env.PERF, 'set PERF=1 to run');

  test('150 cards: pan a 60 fps e rota < 2 s em 4G', async ({ page, request, browserName }) => {
    test.setTimeout(180_000);
    const { headers, userId } = await signUpAndLogin(page, request);
    // Free allows 50 cards: make the perf user Pro (as map-perf.spec does)
    psql(`insert into subscriptions (user_id, plan, status) values ('${userId}','pro','active') on conflict (user_id) do update set plan='pro'`);
    const board = (await (await request.post(`${API}/v1/boards`, { headers, data: { title: 'Perf 150' } })).json()).data.id as string;
    const ids = Array.from({ length: 150 }, () => crypto.randomUUID());
    const cardOps = [
      ...ids.map((id, i) => ({ op: 'createCard', opId: crypto.randomUUID(), boardId: board, card: { id, type: 'concept', title: `Conceito ${i}`, position: { x: (i % 10) * 200, y: Math.floor(i / 10) * 160 } } })),
    ];
    const edgeOps = [
      ...ids.slice(1).map((to, i) => ({ op: 'createEdge', opId: crypto.randomUUID(), boardId: board, edge: { id: crypto.randomUUID(), fromCardId: ids[i], toCardId: to, label: i % 2 ? 'causa' : null } })),
    ];
    for (const ops of [cardOps, edgeOps]) expect((await request.post(`${API}/v1/boards/ops`, { headers, data: { ops } })).status()).toBe(200); // ≤ 200 ops per call

    // warm the route (dev compile), then measure on "Fast 4G"-like throttling (Chromium only: CDP)
    await page.goto(`/app/mapas/${board}`);
    await expect(page.locator('.react-flow__node').first()).toBeVisible();
    if (browserName === 'chromium') {
      const cdp = await page.context().newCDPSession(page);
      await cdp.send('Network.enable');
      await cdp.send('Network.setCacheDisabled', { cacheDisabled: true }); // cold bundles: the worst case, not a warm reload
      await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: (9 * 1024 * 1024) / 8, uploadThroughput: (1.5 * 1024 * 1024) / 8 });
      const t0 = Date.now();
      await page.goto(`/app/mapas/${board}`);
      await expect(page.locator('.react-flow__node').first()).toBeVisible();
      const ms = Date.now() - t0;
      test.info().annotations.push({ type: 'route-4g-ms', description: String(ms) });
      // `next dev` ships unminified bundles: the 2 s budget only means something against `next build && next start` (PERF_PROD=1)
      if (process.env.PERF_PROD) expect(ms).toBeLessThan(2000);
      console.log(`route on 4G: ${ms} ms`);
      await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
    }

    await page.evaluate(() => {
      const w = window as unknown as { __frames: number[] };
      w.__frames = [];
      let last = performance.now();
      const tick = (n: number) => {
        w.__frames.push(n - last);
        last = n;
        if (w.__frames.length < 400) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    const pane = (await page.locator('.react-flow__pane').boundingBox())!;
    const cx = pane.x + pane.width / 2;
    const cy = pane.y + pane.height / 2;
    for (let i = 0; i < 4; i++) {
      await page.mouse.move(cx, cy);
      await page.mouse.down();
      await page.mouse.move(cx + (i % 2 ? 150 : -150), cy + (i % 2 ? -200 : 200), { steps: 30 });
      await page.mouse.up();
    }
    const frames = await page.evaluate(() => (window as unknown as { __frames: number[] }).__frames.slice(5));
    const sorted = [...frames].sort((a, b) => a - b);
    const p50 = sorted[Math.floor(sorted.length / 2)]!;
    const fps = 1000 / p50;
    test.info().annotations.push({ type: 'pan-fps-p50', description: fps.toFixed(1) });
    console.log(`pan fps p50: ${fps.toFixed(1)} (${frames.length} frames, p95 ${sorted[Math.floor(sorted.length * 0.95)]!.toFixed(1)} ms)`);
    expect(fps).toBeGreaterThanOrEqual(55);
  });
});
