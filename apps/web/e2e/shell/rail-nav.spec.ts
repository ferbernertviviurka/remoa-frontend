import { expect, test, type Locator, type Page } from '@playwright/test';
import { accountUser } from '../account/fixture';

// D-625: a click on the rail / bottom nav answers on the next frame (active item + destination skeleton), the content streams in
// after. Timings come from the page itself (capture-phase click → first rAF that sees the change). `PERF=1` prints them.
type Probe = { active: number | null; skeleton: number | null; content: number };

async function clickAndProbe(page: Page, link: Locator, target: string): Promise<Probe> {
  await page.waitForLoadState('networkidle'); // prefetch done, as a user who reads the page for a second
  const handle = await link.elementHandle();
  const probe = page.evaluate(
    ([el, target]) =>
      new Promise<Probe>((resolve) => {
        let t0: number | null = null;
        let active: number | null = null;
        let skeleton: number | null = null;
        addEventListener('click', () => void (t0 = performance.now()), { capture: true, once: true });
        const tick = () => {
          if (t0 != null) {
            const dt = performance.now() - t0;
            const busy = document.querySelector('main [aria-busy="true"]');
            if (active == null && (el as Element).getAttribute('aria-current') === 'page') active = dt;
            if (skeleton == null && busy) skeleton = dt;
            if (location.pathname === target && !busy && dt > 0) return resolve({ active, skeleton, content: dt });
            if (dt > 15_000) return resolve({ active, skeleton, content: -1 });
          }
          requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }),
    [handle, target] as const,
  );
  await link.click();
  const r = await probe;
  if (process.env.PERF) console.log(`[perf] ${target}: active ${r.active?.toFixed(0)} ms, skeleton ${r.skeleton?.toFixed(0)} ms, content ${r.content.toFixed(0)} ms`);
  return r;
}

test.describe('desktop rail', () => {
  test.use({ viewport: { width: 1440, height: 900 } });
  test('every rail item: active + skeleton on the next frame, then the page', async ({ page, request }) => {
    test.setTimeout(180_000);
    await accountUser(page, request);
    await page.goto('/app/hoje');
    const rail = page.getByRole('navigation', { name: 'Principal' });
    for (const href of ['/app/mapas', '/app/revisar', '/app/cobertura', '/app/progresso', '/app/loja', '/app/hoje']) {
      const r = await clickAndProbe(page, rail.locator(`a[href="${href}"]`), href);
      expect.soft(r.content, href).toBeGreaterThan(0);
      expect.soft(r.active, href).not.toBeNull();
      expect.soft(r.active!, href).toBeLessThan(100);
      // a page that is ready within a frame or two may never show the skeleton; that is fine, it is the goal
      if (r.skeleton != null) expect.soft(r.skeleton, href).toBeLessThan(100);
      else expect.soft(r.content, href).toBeLessThan(100);
    }
  });
});

test.describe('bottom nav', () => {
  test.use({ viewport: { width: 390, height: 844 } });
  test('every bottom-nav item: active + skeleton on the next frame, then the page', async ({ page, request }) => {
    test.setTimeout(180_000);
    await accountUser(page, request);
    await page.goto('/app/hoje');
    // `next dev` only: the dev-tools indicator (nextjs-portal) sits bottom-left, over the first bottom-nav item, and swallows the click
    await page.addStyleTag({ content: 'nextjs-portal { display: none !important; }' });
    const nav = page.getByRole('navigation', { name: 'Navegação inferior' });
    for (const href of ['/app/revisar', '/app/mapas', '/app/cobertura', '/app/loja', '/app/conta/perfil']) {
      const r = await clickAndProbe(page, nav.locator(`a[href="${href}"]`), href);
      expect.soft(r.content, href).toBeGreaterThan(0);
      expect.soft(r.active!, href).toBeLessThan(100);
      if (r.skeleton != null) expect.soft(r.skeleton, href).toBeLessThan(100);
      else expect.soft(r.content, href).toBeLessThan(100);
    }
  });
});
