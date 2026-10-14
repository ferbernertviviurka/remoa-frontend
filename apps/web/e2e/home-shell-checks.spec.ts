// D-1842 / D-1844 against a running app. Item 7 needs an API started with QUESTIONS_BANK_STUDENT_ENABLED=1 and
// QUESTIONS_STUDENT_EMAILS=<BANK_EMAIL>; BANK_EMAIL is passed to this spec (skipped without it). Run with --workers=1.
import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { API, signUpApi } from './account/fixture';

const env = (k: string) => process.env[k] ?? new RegExp(`^${k}="?([^"\\n]*)"?$`, 'm').exec(readFileSync('.env.local', 'utf8'))?.[1] ?? '';

async function student(page: Page, request: APIRequestContext, email = `e2e-home-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@remoa.test`) {
  const su = await signUpApi(request, email);
  const headers = { authorization: `Bearer ${su.access_token as string}` };
  await request.post(`${API}/v1/onboarding/complete`, { headers }).catch(() => undefined);
  expect((await request.patch(`${API}/v1/account/profile`, { headers, data: { name: 'Aluna Teste', phone: '11912345678', userType: 'aluno' } })).status()).toBe(200);
  const key = `sb-${new URL(env('NEXT_PUBLIC_SUPABASE_URL')).hostname.split('.')[0]}-auth-token`;
  const value = 'base64-' + Buffer.from(JSON.stringify(su)).toString('base64url');
  const chunks = value.match(/.{1,3180}/g) ?? [];
  await page.context().addCookies((chunks.length === 1 ? [value] : chunks).map((v, i) => ({ name: chunks.length === 1 ? key : `${key}.${i}`, value: v, domain: 'localhost', path: '/', sameSite: 'Lax' as const })));
}

const featureCalls = (page: Page) => {
  const calls: string[] = [];
  page.on('request', (r) => { if (r.url().includes('/v1/question-features')) calls.push(r.url()); });
  return calls;
};

test('Home: one question-features call per load; "Comece por aqui" closes for good; banner shows', async ({ page, request }) => {
  await student(page, request);
  const calls = featureCalls(page);
  await page.goto('/app/hoje');
  const box = page.getByRole('region', { name: 'Comece por aqui' });
  await expect(box).toBeVisible({ timeout: 30_000 });
  await page.waitForLoadState('networkidle');
  expect(calls.length).toBe(1);
  await page.screenshot({ path: 'test-results/home-checks/home.png', fullPage: true });

  await box.getByRole('button', { name: 'Fechar o Comece por aqui' }).click();
  await expect(box).toBeHidden();
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole('region', { name: 'Comece por aqui' })).toBeHidden();
  await expect(page.getByRole('heading', { name: 'Mapas prontos, atualizados na biblioteca' })).toBeVisible();
});

test('Home: an installed app (standalone) marks "Instalar no celular" done, also later in a normal tab', async ({ page, request }) => {
  await student(page, request);
  await page.addInitScript(() => {
    if (sessionStorage.getItem('as-tab')) return;
    const mm = window.matchMedia.bind(window);
    window.matchMedia = (q: string) => (q.includes('display-mode: standalone') ? ({ ...mm(q), matches: true, media: q } as MediaQueryList) : mm(q));
  });
  await page.goto('/app/hoje');
  const install = page.getByRole('region', { name: 'Comece por aqui' }).locator('li', { hasText: 'Instalar no celular' });
  await expect(install).toHaveAttribute('data-done', 'true', { timeout: 30_000 });
  await page.evaluate(() => sessionStorage.setItem('as-tab', '1')); // next load: a normal browser tab
  await page.reload();
  await expect(page.getByRole('region', { name: 'Comece por aqui' }).locator('li', { hasText: 'Instalar no celular' })).toHaveAttribute('data-done', 'true', { timeout: 30_000 });
});

test('Rail: Questões and Provas only for the e-mail in QUESTIONS_STUDENT_EMAILS', async ({ page, request, browser }) => {
  test.skip(!process.env.BANK_EMAIL, 'needs BANK_EMAIL + an API started with the allowlist');
  await student(page, request, process.env.BANK_EMAIL);
  await page.goto('/app/hoje');
  const nav = page.getByRole('navigation').first();
  await expect(page.getByRole('link', { name: 'Questões' }).first()).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole('link', { name: 'Provas' }).first()).toBeVisible();
  await expect(nav).toBeVisible();

  const other = await (await browser.newContext()).newPage();
  await student(other, request);
  await other.goto('/app/hoje');
  await expect(other.getByRole('region', { name: 'Comece por aqui' })).toBeVisible({ timeout: 30_000 });
  await other.waitForLoadState('networkidle');
  await expect(other.getByRole('link', { name: 'Questões' })).toHaveCount(0);
  await expect(other.getByRole('link', { name: 'Provas' })).toHaveCount(0);
});
