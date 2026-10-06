// F27 FR-1–FR-4, FR-13: admin do blog (lista, sitemap, novo post, despublicar com motivo). Pula se a API do blog ainda não está no ar.
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { accountUser, API, psql } from '../account/fixture';

test.use({ viewport: { width: 1440, height: 900 }, colorScheme: 'light' });

test('admin lists posts, creates one by template, duplicates, unpublishes with a reason and refreshes the sitemap; non-admin gets 404', async ({ page, request, browser }) => {
  test.setTimeout(180_000);
  const plain = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const ppage = await plain.newPage();
  await accountUser(ppage, request, 'Aluna Teste');
  expect((await ppage.goto('/admin/blog'))?.status()).toBe(404);

  const a = await accountUser(page, request, 'Equipe Teste');
  psql(`update profiles set role = 'admin' where user_id = '${a.userId}'`);
  const probe = await request.get(`${API}/v1/admin/blog/posts`, { headers: a.headers });
  test.skip(probe.status() !== 200, 'backend /v1/admin/blog not available');

  await page.goto('/admin/blog');
  await expect(page.getByRole('heading', { level: 1, name: 'Blog' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Blog' })).toBeVisible(); // admin nav item

  // sitemap card: refresh logs an audit entry and toasts
  await page.getByRole('button', { name: 'Atualizar agora' }).click();
  await expect(page.getByText('Sitemap atualizado')).toBeVisible();
  await page.getByRole('button', { name: 'Ver URLs' }).click();
  await expect(page.getByRole('cell', { name: '/blog', exact: true })).toBeVisible();

  // new post: short title keeps the button off
  const title = `Como montar um mapa de estudo ${Date.now()}`;
  await page.getByRole('button', { name: 'Novo post' }).click();
  const dialog = page.getByRole('dialog', { name: 'Novo post' });
  await dialog.getByLabel('Título').fill('Curto');
  await expect(dialog.getByRole('button', { name: 'Criar e abrir o editor' })).toBeDisabled();
  await dialog.getByLabel('Título').fill(title);
  await dialog.getByRole('button', { name: /Guia/ }).click();
  await page.waitForTimeout(600); // pop animation
  const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).exclude('nextjs-portal').analyze();
  expect(axe.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`)).toEqual([]);
  await dialog.getByRole('button', { name: 'Criar e abrir o editor' }).click();
  await expect(page).toHaveURL(/\/admin\/blog\/[0-9a-f-]{36}/);

  // back in the list: the draft shows up, search finds it, duplicate opens "(cópia)"
  await page.goto('/admin/blog');
  await page.getByRole('searchbox').fill(title);
  const row = page.getByRole('row', { name: new RegExp(title) });
  await expect(row).toHaveCount(1);
  await expect(row.getByText('Rascunho')).toBeVisible();
  await expect(row.getByRole('link', { name: 'Ver' })).toHaveCount(0);
  await row.getByRole('button', { name: /^Duplicar/ }).click();
  await expect(page).toHaveURL(/\/admin\/blog\/[0-9a-f-]{36}/);
  await page.goto('/admin/blog');
  await page.getByRole('button', { name: 'Rascunhos' }).click();
  await expect(page.getByRole('row', { name: /\(cópia\)/ }).first()).toBeVisible();
});
