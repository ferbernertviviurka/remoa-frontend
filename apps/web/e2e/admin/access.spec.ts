// F19 FR-11 / rule 9: non-admin gets 404 everywhere under /admin; admin sees the overview (axe clean).
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { accountUser, API, psql } from '../account/fixture';

const routes = ['/admin', '/admin/usuarios', '/admin/mapas', '/admin/transacoes', '/admin/indicacoes', '/admin/suporte', '/admin/auditoria'];

test('anonymous is sent to sign-in, never shown the admin', async ({ page }) => {
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/entrar\?next=%2Fadmin/);
});

test('non-admin gets 404 on /admin and every subroute, and no rail item', async ({ page, request }) => {
  await accountUser(page, request);
  for (const path of routes) {
    const res = await page.goto(path);
    expect(res?.status(), path).toBe(404);
    await expect(page.getByRole('navigation', { name: 'Painel de administração' })).toHaveCount(0);
  }
  await page.goto('/app/hoje');
  await expect(page.getByRole('link', { name: 'Admin', exact: true })).toHaveCount(0);
});

test('admin sees the overview, the rail item and no axe violations', async ({ page, request }) => {
  const u = await accountUser(page, request);
  psql(`update profiles set role = 'admin' where user_id = '${u.userId}'`);
  const me = await request.get(`${API}/v1/admin/me`, { headers: u.headers });
  const ov = me.status() === 200 && (await request.get(`${API}/v1/admin/overview`, { headers: u.headers }));
  test.skip(!ov || ov.status() !== 200, 'backend T3/T4 (/v1/admin/me, /overview) not available yet');

  await page.goto('/app/hoje');
  await expect(page.getByRole('link', { name: 'Admin', exact: true })).toBeVisible();
  const res = await page.goto('/admin');
  expect(res?.status()).toBe(200);
  await expect(page.getByRole('heading', { level: 1, name: 'Visão geral' })).toBeVisible();
  await page.getByRole('button', { name: '7 dias' }).click();
  await expect(page).toHaveURL(/period=7/);
  await page.waitForFunction(() => document.getAnimations().every((a) => a.effect?.getComputedTiming().iterations === Infinity || a.playState !== 'running')); // rows fade in: axe must not sample mid-animation
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).exclude('nextjs-portal').analyze();
  expect(r.violations).toEqual([]);
});
