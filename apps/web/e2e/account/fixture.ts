// Shared by the account specs: a fresh user (signUpAndLogin from the visual fixture) with an optional name, plus API/psql helpers.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { expect, type APIRequestContext, type Page } from '@playwright/test';
import { signUpAndLogin } from '../visual/fixture';

export const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
export const PASSWORD = 'senha-forte-123';

export async function accountUser(page: Page, request: APIRequestContext, name: string | null = 'Marina Alves') {
  const u = await signUpAndLogin(page, request);
  if (name) {
    const r = await request.patch(`${API}/v1/account/profile`, { headers: u.headers, data: { name } });
    expect(r.status()).toBe(200);
  }
  return u;
}

export const psql = (sql: string) => {
  const db = process.env.DATABASE_URL ?? /DATABASE_URL="?([^"\n]*)/.exec(readFileSync('../../../remoa-backend/.env', 'utf8'))?.[1] ?? '';
  return execFileSync('psql', [db, '-q', '-t', '-A', '-c', sql]).toString().trim();
};

/** Signs the same user in again through GoTrue: a second session (device) with a distinct user agent. */
export async function secondSession(request: APIRequestContext, email: string, password = PASSWORD) {
  const env = (k: string) => process.env[k] ?? new RegExp(`^${k}="?([^"\\n]*)"?$`, 'm').exec(readFileSync('.env.local', 'utf8'))?.[1] ?? '';
  const r = await request.post(`${env('NEXT_PUBLIC_SUPABASE_URL')}/auth/v1/token?grant_type=password`, {
    headers: { apikey: env('NEXT_PUBLIC_SUPABASE_ANON_KEY'), 'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1' },
    data: { email, password },
  });
  expect(r.ok()).toBeTruthy();
  const j = await r.json();
  return { token: j.access_token as string, refresh: j.refresh_token as string };
}

export const sections = ['perfil', 'seguranca', 'plano', 'preferencias', 'dados'] as const;
