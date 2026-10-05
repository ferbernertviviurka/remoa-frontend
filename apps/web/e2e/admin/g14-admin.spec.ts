// G14 (A1): stale admin session -> password confirm in place; waitlist tab; sticky aside; sign out. Run with --workers=1.
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import { PASSWORD, psql, signUpApi } from '../account/fixture';
import { readFileSync } from 'node:fs';

const env = (k: string) => process.env[k] ?? new RegExp(`^${k}="?([^"\\n]*)"?$`, 'm').exec(readFileSync('.env.local', 'utf8'))?.[1] ?? '';

async function setSession(page: Page, session: unknown) {
  const key = `sb-${new URL(env('NEXT_PUBLIC_SUPABASE_URL')).hostname.split('.')[0]}-auth-token`;
  const value = 'base64-' + Buffer.from(JSON.stringify(session)).toString('base64url');
  const chunks = value.match(/.{1,3180}/g) ?? [];
  await page.context().addCookies((chunks.length === 1 ? [value] : chunks).map((v, i) => ({ name: chunks.length === 1 ? key : `${key}.${i}`, value: v, domain: 'localhost', path: '/', sameSite: 'Lax' as const })));
}

/** Admin whose last real sign-in was 2 days ago: backdate the amr claim, then refresh the token (the new JWT keeps the old timestamp). */
async function staleAdmin(page: Page, request: APIRequestContext) {
  const email = `e2e-adm-${Date.now()}@remoa.test`;
  const su = await signUpApi(request, email);
  psql(`update profiles set role = 'admin' where user_id = '${su.user.id}'`);
  psql(`update auth.mfa_amr_claims set updated_at = now() - interval '2 days' where session_id = (select id from auth.sessions where user_id = '${su.user.id}' limit 1)`);
  const r = await request.post(`${env('NEXT_PUBLIC_SUPABASE_URL')}/auth/v1/token?grant_type=refresh_token`, { headers: { apikey: env('NEXT_PUBLIC_SUPABASE_ANON_KEY') }, data: { refresh_token: su.refresh_token } });
  expect(r.ok()).toBeTruthy();
  await setSession(page, await r.json());
  return email;
}

test('stale admin confirms the password in place; waitlist tab; sticky aside; sign out', async ({ page, request }) => {
  await staleAdmin(page, request);

  await page.goto('/admin/usuarios');
  await expect(page.getByRole('heading', { name: 'Confirme sua senha para continuar' })).toBeVisible();
  await page.getByLabel('Senha').fill('errada-errada');
  await page.getByRole('button', { name: 'Confirmar' }).click();
  await expect(page.getByText('Senha incorreta. Tente de novo.')).toBeVisible();
  const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).exclude('nextjs-portal').analyze();
  expect(axe.violations).toEqual([]);

  await page.getByLabel('Senha').fill(PASSWORD);
  await page.getByRole('button', { name: 'Confirmar' }).click();
  await expect(page.getByRole('heading', { level: 1, name: /Gerenciar usuários|Usuários/ })).toBeVisible({ timeout: 20_000 });

  const wl = `g14-${Date.now()}@teste.com`;
  psql(`insert into waitlist (email, segment, variant, source) values ('${wl}', 'y5_6', '29', 'landing')`);
  await page.getByRole('link', { name: 'Lista de espera' }).click();
  await expect(page).toHaveURL(/\/admin\/lista-de-espera/);
  await expect(page.getByRole('heading', { level: 1, name: 'Lista de espera' })).toBeVisible();
  await expect(page.getByRole('table', { name: 'Lista de espera' })).toBeVisible();
  await page.getByRole('searchbox').fill(wl);
  await expect(page.getByRole('cell', { name: wl })).toBeVisible();
  await page.waitForFunction(() => document.getAnimations().every((a) => a.effect?.getComputedTiming().iterations === Infinity || a.playState !== 'running'));
  const axe2 = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).exclude('nextjs-portal').analyze();
  expect(axe2.violations).toEqual([]);
  await page.getByRole('button', { name: 'Exportar CSV', exact: true }).waitFor();
  psql(`delete from waitlist where email = '${wl}'`);

  // aside stays put when the page scrolls
  await page.evaluate(() => { document.querySelector('main')!.style.minHeight = '3000px'; window.scrollTo(0, 800); });
  const nav = page.getByRole('navigation', { name: 'Painel de administração' });
  expect((await nav.boundingBox())?.y).toBe(0);

  await nav.getByRole('button', { name: 'Sair' }).click();
  await page.waitForURL(/\/entrar/);
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/entrar/);
});
