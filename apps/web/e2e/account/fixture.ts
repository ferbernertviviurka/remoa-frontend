// Shared by the account specs: a fresh user (signUpAndLogin from the visual fixture) with an optional name, plus API/psql helpers.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { expect, type APIRequestContext, type Page } from '@playwright/test';

export const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
export const PASSWORD = 'senha-forte-123';

const env = (k: string) => process.env[k] ?? new RegExp(`^${k}="?([^"\\n]*)"?$`, 'm').exec(readFileSync('.env.local', 'utf8'))?.[1] ?? '';

/**
 * Fresh user without the sign-in form: sign-up through GoTrue (1 call) and the session is written as the @supabase/ssr
 * cookie (`sb-<ref>-auth-token`, "base64-" + base64url(JSON), chunks of 3180). The local GoTrue allows 30 sign-ins per
 * 5 minutes per IP and other sessions share it, so one call per test keeps the suite from hitting the limit.
 */
export async function accountUser(page: Page, request: APIRequestContext, name: string | null = 'Marina Alves') {
  const email = `e2e-acc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@remoa.test`;
  const su = await signUpApi(request, email);
  const url = new URL(env('NEXT_PUBLIC_SUPABASE_URL'));
  const key = `sb-${url.hostname.split('.')[0]}-auth-token`;
  const value = 'base64-' + Buffer.from(JSON.stringify(su)).toString('base64url');
  const chunks = value.match(/.{1,3180}/g) ?? [];
  await page.context().addCookies(
    (chunks.length === 1 ? [value] : chunks).map((v, i) => ({ name: chunks.length === 1 ? key : `${key}.${i}`, value: v, domain: 'localhost', path: '/', sameSite: 'Lax' as const })),
  );
  const headers = { authorization: `Bearer ${su.access_token as string}` };
  if (name) {
    const r = await request.patch(`${API}/v1/account/profile`, { headers, data: { name } });
    expect(r.status()).toBe(200);
  }
  return { email, userId: su.user.id as string, headers };
}

export const psql = (sql: string) => {
  const db = process.env.DATABASE_URL ?? /DATABASE_URL="?([^"\n]*)/.exec(readFileSync('../../../remoa-backend/.env', 'utf8'))?.[1] ?? '';
  return execFileSync('psql', [db, '-q', '-t', '-A', '-c', sql]).toString().trim();
};

/** Signs the same user in again through GoTrue: a second session (device) with a distinct user agent. */
export async function secondSession(request: APIRequestContext, email: string, password = PASSWORD) {
  const r = await request.post(`${env('NEXT_PUBLIC_SUPABASE_URL')}/auth/v1/token?grant_type=password`, {
    headers: { apikey: env('NEXT_PUBLIC_SUPABASE_ANON_KEY'), 'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1' },
    data: { email, password },
  });
  expect(r.ok()).toBeTruthy();
  const j = await r.json();
  return { token: j.access_token as string, refresh: j.refresh_token as string };
}

export const sections = ['perfil', 'seguranca', 'plano', 'preferencias', 'dados'] as const;

/** Sign-up straight through GoTrue (no browser): returns the session JSON. */
export async function signUpApi(request: APIRequestContext, email: string, password = PASSWORD) {
  const r = await request.post(`${env('NEXT_PUBLIC_SUPABASE_URL')}/auth/v1/signup`, { headers: { apikey: env('NEXT_PUBLIC_SUPABASE_ANON_KEY') }, data: { email, password } });
  expect(r.ok()).toBeTruthy();
  const su = await r.json();
  // F12: a new account is redirected to the onboarding; API-made users are about something else, so they have it done already.
  await request.post(`${API}/v1/onboarding/complete`, { headers: { authorization: `Bearer ${su.access_token as string}` } }).catch(() => undefined);
  return su;
}
