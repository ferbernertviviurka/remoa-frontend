// D-1837 (F19 FR-11): an admin signed in 1 h ago (inside the 12 h session, past the 30 min for sensitive actions) gets the password
// dialog in place when an action is refused, confirms, repeats the same action and it goes through. Run with --workers=1.
import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { accountUser, PASSWORD, psql, signUpApi } from '../account/fixture';

const env = (k: string) => process.env[k] ?? new RegExp(`^${k}="?([^"\\n]*)"?$`, 'm').exec(readFileSync('.env.local', 'utf8'))?.[1] ?? '';

test('sensitive action past 30 min: password dialog in place, then the same action succeeds', async ({ page, request, browser }) => {
  test.setTimeout(180_000);
  const su = await signUpApi(request, `e2e-adm-re-${Date.now()}@remoa.test`);
  psql(`update profiles set role = 'admin', name = 'Equipe Teste' where user_id = '${su.user.id}'`);
  psql(`update auth.mfa_amr_claims set updated_at = now() - interval '1 hour' where session_id = (select id from auth.sessions where user_id = '${su.user.id}' limit 1)`);
  const r = await request.post(`${env('NEXT_PUBLIC_SUPABASE_URL')}/auth/v1/token?grant_type=refresh_token`, { headers: { apikey: env('NEXT_PUBLIC_SUPABASE_ANON_KEY') }, data: { refresh_token: su.refresh_token } });
  expect(r.ok()).toBeTruthy();
  const session = await r.json();
  const key = `sb-${new URL(env('NEXT_PUBLIC_SUPABASE_URL')).hostname.split('.')[0]}-auth-token`;
  const value = 'base64-' + Buffer.from(JSON.stringify(session)).toString('base64url');
  const chunks = value.match(/.{1,3180}/g) ?? [];
  await page.context().addCookies((chunks.length === 1 ? [value] : chunks).map((v, i) => ({ name: chunks.length === 1 ? key : `${key}.${i}`, value: v, domain: 'localhost', path: '/', sameSite: 'Lax' as const })));

  const target = await accountUser(await (await browser.newContext()).newPage(), request, 'Paciente Reauth');

  await page.goto(`/admin/usuarios?q=${encodeURIComponent(target.email)}`);
  await expect(page.getByRole('heading', { level: 1, name: 'Usuários' })).toBeVisible(); // 12 h session still open: no full-page confirm
  await page.getByRole('button', { name: /Paciente Reauth/ }).click();
  await page.getByRole('dialog', { name: 'Paciente Reauth' }).getByRole('button', { name: 'Conceder 1 mês de Pro' }).click();
  const reason = page.getByRole('alertdialog');
  await reason.getByLabel('Motivo (obrigatório)').fill('Cortesia de teste e2e');
  await reason.getByRole('button', { name: 'Conceder' }).click();

  const prompt = page.getByRole('dialog', { name: 'Reautenticação necessária' });
  await expect(prompt).toBeVisible();
  await prompt.getByLabel('Senha').fill(PASSWORD);
  await prompt.getByRole('button', { name: 'Confirmar' }).click();
  await expect(prompt).toBeHidden({ timeout: 20_000 });

  await reason.getByRole('button', { name: 'Conceder' }).click();
  await expect(reason.getByRole('status')).toContainText(/Ação registrada na auditoria \(a_\d+\)/);
  expect(psql(`select count(*) from entitlement_grants where user_id = '${target.userId}' and source = 'support'`)).toBe('1');
});
