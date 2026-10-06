// F18 T7: a fresh inviter (Supabase signup + profile name) and the web helpers shared by the invite specs.
import { readFileSync } from 'node:fs';
import { expect, type APIRequestContext, type Page } from '@playwright/test';
import { formReady } from '../sign-up';

const env = (k: string) => process.env[k] ?? new RegExp(`^${k}="?([^"\\n]*)"?$`, 'm').exec(readFileSync('.env.local', 'utf8'))?.[1] ?? '';
export const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
export const password = 'senha-forte-123';

export async function createInviter(request: APIRequestContext, name = 'Ana') {
  const email = `e2e-ind-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@remoa.test`;
  const su = await (await request.post(`${env('NEXT_PUBLIC_SUPABASE_URL')}/auth/v1/signup`, { headers: { apikey: env('NEXT_PUBLIC_SUPABASE_ANON_KEY') }, data: { email, password } })).json();
  const headers = { authorization: `Bearer ${su.access_token as string}` };
  await request.patch(`${API}/v1/account/profile`, { headers, data: { name, phone: '11912345678', userType: 'aluno' } });
  const summary = await (await request.get(`${API}/v1/referral/summary`, { headers })).json();
  expect(summary.ok, 'GET /v1/referral/summary').toBe(true);
  return { email, headers, code: summary.data.code as string };
}

export const friendsOf = async (request: APIRequestContext, headers: { authorization: string }) =>
  ((await (await request.get(`${API}/v1/referral/summary`, { headers })).json()).data.friends as { status: string }[]);

export const rfCookie = async (page: Page) => (await page.context().cookies()).find((c) => c.name === 'rf');

/** `/i/[code]` hydrated and ready to type (same trick as the other auth forms). */
export async function openInvite(page: Page, code: string) {
  await page.goto(`/i/${code}`);
  await formReady(page);
}

export async function fillSignUp(page: Page, email: string) {
  await page.getByLabel('Nome').fill('Amiga Teste'); // G20: name is required
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha').fill(password);
  await page.getByRole('button', { name: /Criar conta/ }).click();
}
