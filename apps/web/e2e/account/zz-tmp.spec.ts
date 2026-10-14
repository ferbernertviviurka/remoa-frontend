import { test } from '@playwright/test';
import { accountUser } from './fixture';
test('shots', async ({ page, request }) => {
  test.setTimeout(240_000);
  const out = process.env.SHOTS_OUT ?? '/tmp';
  const u = await accountUser(page, request, 'Marina Alves'); const rr = await request.get('http://localhost:4000/v1/account/me', { headers: u.headers }); console.log('ME', rr.status(), (await rr.text()).slice(0, 800));
  for (const [n, w, h] of [['1440', 1440, 900], ['390', 390, 844]] as const) {
    await page.setViewportSize({ width: w, height: h });
    await page.goto('/app/conta/perfil');
    await page.waitForLoadState('networkidle'); await page.waitForTimeout(2500);
    const sw = await page.evaluate(() => [document.documentElement.scrollWidth, innerWidth]);
    console.log('SCROLLW', n, sw);
    await page.screenshot({ path: `${out}/perfil-${n}.png`, fullPage: true, animations: 'disabled' });
  }
});
