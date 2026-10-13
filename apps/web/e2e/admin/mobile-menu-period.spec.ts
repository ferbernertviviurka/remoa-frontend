// Admin on a phone: the aside is hidden behind a hamburger; the overview period filter changes the URL and the data.
import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { psql, signUpApi } from '../account/fixture';

const env = (k: string) => process.env[k] ?? new RegExp(`^${k}="?([^"\\n]*)"?$`, 'm').exec(readFileSync('.env.local', 'utf8'))?.[1] ?? '';

test.use({ viewport: { width: 390, height: 800 } });

test('hamburger opens/closes the nav; period filter reloads the overview', async ({ page, request }) => {
  const su = await signUpApi(request, `e2e-adm-mob-${Date.now()}@remoa.test`);
  psql(`update profiles set role = 'admin', name = 'Equipe Teste' where user_id = '${su.user.id}'`);
  const key = `sb-${new URL(env('NEXT_PUBLIC_SUPABASE_URL')).hostname.split('.')[0]}-auth-token`;
  const value = 'base64-' + Buffer.from(JSON.stringify(su)).toString('base64url');
  const chunks = value.match(/.{1,3180}/g) ?? [];
  await page.context().addCookies((chunks.length === 1 ? [value] : chunks).map((v, i) => ({ name: chunks.length === 1 ? key : `${key}.${i}`, value: v, domain: 'localhost', path: '/', sameSite: 'Lax' as const })));

  await page.goto('/admin');
  const menu = page.getByRole('button', { name: 'Abrir menu do painel' });
  await expect(menu).toBeVisible();
  await expect(page.getByRole('link', { name: 'Usuários' })).toBeHidden();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  await menu.click();
  await expect(page.getByRole('link', { name: 'Usuários' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('link', { name: 'Usuários' })).toBeHidden();
  await expect(menu).toBeFocused();

  await menu.click();
  await page.mouse.click(380, 790); // outside the panel
  await expect(page.getByRole('link', { name: 'Usuários' })).toBeHidden();

  await menu.click();
  await page.getByRole('link', { name: 'Usuários' }).click();
  await expect(page).toHaveURL(/\/admin\/usuarios/);
  await expect(page.getByRole('link', { name: 'Mapas' })).toBeHidden();

  await page.goto('/admin');
  const main = page.getByRole('main');
  const chart = page.getByRole('region', { name: 'Crescimento no período' });
  await expect(chart.getByText('há 30 dias')).toBeVisible();
  const before = await main.innerText();
  await page.getByRole('button', { name: '7 dias' }).click();
  await expect(page).toHaveURL(/period=7/);
  await expect(page.getByRole('button', { name: '7 dias' })).toHaveAttribute('aria-pressed', 'true');
  await expect(chart.getByText('há 7 dias')).toBeVisible();
  const kpis = (x: string) => x.split('Crescimento')[0]!.replace(/há \d+ dias/g, '');
  expect(kpis(await main.innerText())).not.toBe(kpis(before));
  await page.getByRole('button', { name: '90 dias' }).click();
  await expect(chart.getByText('há 90 dias')).toBeVisible();

  for (const r of ['usuarios', 'mapas', 'transacoes', 'lista-de-espera', 'indicacoes', 'suporte', 'blog', 'auditoria', '']) {
    await page.goto(`/admin/${r}`);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth), `/admin/${r} overflows`).toBeLessThanOrEqual(0);
  }
});
