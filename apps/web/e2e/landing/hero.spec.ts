// F16 / T2: landing hero (FR-3, FR-4, FR-17, FR-18, FR-21). HERO_URL overrides the page (default `/`).
import { gotoLanding } from './ready';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { strings } from '@remoa/strings/full';

const PAGE = process.env.HERO_URL ?? '/';
const h = strings.landing.hero;
const REF = resolve('../../../docs/design/v2/screens/landing-hero-final.png'); // Playwright runs from apps/web
const stage = (page: Page) => page.getByRole('img', { name: h.stageAria });

/** Share of pixels that differ by more than `tol` per channel (in-browser canvas diff: no image deps). */
async function diffRatio(page: Page, a: Buffer, b: Buffer, tol = 40) {
  return page.evaluate(async ([a64, b64, t]) => {
    const load = async (src: string) => { const i = new Image(); i.src = src; await i.decode(); return i; };
    const [ia, ib] = await Promise.all([load(`data:image/png;base64,${a64}`), load(`data:image/png;base64,${b64}`)]);
    const w = Math.min(ia.width, ib.width), hh = Math.min(ia.height, ib.height);
    const px = (img: HTMLImageElement) => { const c = document.createElement('canvas'); c.width = w; c.height = hh; const x = c.getContext('2d')!; x.drawImage(img, 0, 0); return x.getImageData(0, 0, w, hh).data; };
    const pa = px(ia), pb = px(ib);
    let n = 0;
    for (let i = 0; i < pa.length; i += 4) if (Math.abs(pa[i]! - pb[i]!) > t || Math.abs(pa[i + 1]! - pb[i + 1]!) > t || Math.abs(pa[i + 2]! - pb[i + 2]!) > t) n++;
    return n / (w * hh);
  }, [a.toString('base64'), b.toString('base64'), tol] as const);
}

test.describe('desktop 1440 × 900', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('final frame vs landing-hero-final.png (sanity, generous threshold)', async ({ page }) => {
    await gotoLanding(page, PAGE);
    await expect(stage(page)).toHaveAttribute('data-play', '');
    await page.waitForTimeout(7000);
    const shot = await page.screenshot();
    // copy and map content differ on purpose (D-236, D-089: Torph wins); this only catches a broken layout
    expect(await diffRatio(page, shot, readFileSync(REF))).toBeLessThan(0.3);
  });

  test('the server HTML already is the final frame (LCP-safe)', async ({ request }) => {
    const html = await (await request.get(PAGE)).text();
    const stageHtml = html.slice(html.indexOf('role="img"'), html.indexOf(h.replay));
    expect(stageHtml).not.toContain('data-play');
    for (const text of [h.map.verdictText, h.map.answer, h.map.cards[1]!.text, h.map.edges[0]!]) expect(stageHtml).toContain(text.replace(/>/g, '&gt;'));
    expect(html).toContain('.hx-out'); // timeline CSS inlined, overlays hidden from the first paint
  });

  test('replay restarts the timeline and fires hero_replayed; axe', async ({ page }) => {
    await gotoLanding(page, PAGE);
    await page.waitForTimeout(6500);
    await page.getByRole('button', { name: h.replay }).click();
    await expect(stage(page)).toHaveAttribute('data-play', '');
    const t = await stage(page).evaluate((el) => (el.querySelector('.hx-verdict')!.getAnimations()[0]?.currentTime ?? 0) as number);
    expect(t).toBeLessThan(2000); // restarted from the beginning (verdict enters at 5.4 s)
    expect(await page.evaluate(() => window.__remoaEvents?.map((e) => e.event))).toContain('hero_replayed');
    await page.waitForTimeout(7000);
    const r = await new AxeBuilder({ page }).include('#topo').withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`)).toEqual([]);
  });

  test('CTAs and the only h1', async ({ page }) => {
    await gotoLanding(page, PAGE);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('h1')).toHaveText(h.h1.a);
    await expect(page.getByRole('link', { name: h.cta.secondary })).toHaveAttribute('href', '#experimente');
    await gotoLanding(page, `${PAGE}?h=c`);
    await expect(page.locator('h1')).toHaveText(h.h1.c);
  });
});

test.describe('reduced motion', () => {
  test.use({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });

  test('shows the final frame immediately, nothing animates', async ({ page }) => {
    await gotoLanding(page, PAGE);
    await page.waitForLoadState('networkidle');
    await expect(stage(page)).not.toHaveAttribute('data-play', '');
    const st = await stage(page).evaluate((el) => ({
      anims: el.getAnimations({ subtree: true }).length,
      verdict: getComputedStyle(el.querySelector('.hx-verdict')!).opacity,
      overlay: getComputedStyle(el.querySelector('.hx-out')!).opacity,
    }));
    expect(st).toEqual({ anims: 0, verdict: '1', overlay: '0' });
  });
});

test.describe('mobile 390 × 844', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('4 cards, no horizontal scroll, shorter timeline', async ({ page }) => {
    await gotoLanding(page, PAGE);
    const cards = stage(page).locator('article');
    let visible = 0;
    for (const c of await cards.all()) if (await c.isVisible()) visible++;
    expect(visible).toBe(5); // 4 cards + the tested card's pre-reveal overlay (transparent in the final frame)
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    const k = await stage(page).evaluate((el) => getComputedStyle(el).getPropertyValue('--k').trim());
    expect(Number(k)).toBeLessThan(0.7);
    await stage(page).scrollIntoViewIfNeeded();
    await page.waitForTimeout(5000);
    await stage(page).screenshot({ path: 'test-results/landing-m-hero-stage.png' });
  });
});
