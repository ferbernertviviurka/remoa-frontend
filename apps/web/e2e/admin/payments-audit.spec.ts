// F19 FR-16 / FR-19 / FR-23: Transações and Auditoria pages (axe clean), audit filter + drawer + CSV export with reason.
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { accountUser, API, psql } from '../account/fixture';

test('admin: audit filter, open an entry, export; axe on both pages', async ({ page, request }) => {
  const u = await accountUser(page, request);
  psql(`update profiles set role = 'admin' where user_id = '${u.userId}'`);
  const seed = await request.post(`${API}/v1/admin/export`, { headers: u.headers, data: { reason: 'Seed do teste e2e', resource: 'users', filters: {} } });
  const audit = seed.status() === 200 && (await request.get(`${API}/v1/admin/audit`, { headers: u.headers }));
  const pay = await request.get(`${API}/v1/admin/payments`, { headers: u.headers });
  test.skip(!audit || audit.status() !== 200 || pay.status() !== 200, 'backend T3/T4 (/v1/admin/audit, /payments) not available yet');
  const axe = async () => {
    await page.waitForFunction(() => document.getAnimations().every((a) => a.effect?.getComputedTiming().iterations === Infinity || a.playState !== 'running'));
    return new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).exclude('nextjs-portal').analyze();
  };

  await page.goto('/admin/transacoes');
  await expect(page.getByRole('heading', { level: 1, name: 'Transações' })).toBeVisible();
  await page.getByRole('button', { name: 'Pago', exact: true }).click();
  await expect(page).toHaveURL(/status=paid/);
  expect((await axe()).violations).toEqual([]);

  await page.goto('/admin/auditoria');
  await expect(page.getByRole('heading', { level: 1, name: 'Auditoria' })).toBeVisible();
  await page.getByRole('group', { name: 'Resultado' }).getByRole('button', { name: 'Sucesso' }).click();
  await expect(page).toHaveURL(/result=success/);
  // the DB is shared with other runs: keep only this admin's own entries, so the first row is the seed above
  await page.getByRole('group', { name: 'Quem' }).getByRole('button', { name: 'Você (admin)' }).click();
  await expect(page).toHaveURL(/actor=me/);
  const row = page.getByRole('button', { name: /Abrir registro a_\d+/ }).first();
  await expect(row).toBeVisible();
  await row.click();
  const drawer = page.getByRole('dialog');
  await expect(drawer.getByText('Seed do teste e2e')).toBeVisible();
  await expect(drawer.getByText('Antes', { exact: true })).toBeVisible();
  await page.waitForTimeout(700); // drawer slide-in (450 ms) must finish, axe reads mid-fade colours
  expect((await axe()).violations).toEqual([]);
  await page.keyboard.press('Escape');

  await page.getByRole('button', { name: /Exportar CSV/ }).click();
  await page.getByRole('textbox', { name: /Motivo/ }).fill('Revisão trimestral');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Confirmar' }).click();
  await download;
  await expect(page.getByRole('status')).toContainText(/a_\d+/);
});
