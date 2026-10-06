import { expect, test } from '@playwright/test';
import { accountUser, API } from '../account/fixture';

// F30 (D-1213): a new account starts with 15 days of Pro; the navbar says so and the plans page still sells the Pro.
test('new account: 15 days of Pro, "Pro · teste" chip, plans page offers the subscription', async ({ page, request }) => {
  const { headers } = await accountUser(page, request, 'Marina Alves', true, true);
  const e = (await (await request.get(`${API}/v1/billing/entitlements`, { headers })).json()).data as { plan: string; trialUntil?: string | null; grantUntil?: string | null };
  expect(e.plan).toBe('pro');
  const days = (new Date(e.trialUntil!).getTime() - Date.now()) / 86_400_000;
  expect(days).toBeGreaterThan(14.9);
  expect(days).toBeLessThanOrEqual(15);
  expect(e.grantUntil).toBe(e.trialUntil);

  await page.goto('/app/hoje');
  await page.getByRole('button', { name: 'Ver detalhes do plano' }).click();
  await expect(page.getByText('Você está no teste grátis do Pro')).toBeVisible();
  await expect(page.getByText(/Faltam 15 dias/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Gerenciar assinatura' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Assinar o Pro' }).click();
  await page.waitForURL(/\/app\/planos/);
  await expect(page.getByRole('status').filter({ hasText: 'Você está no teste grátis do Pro' })).toBeVisible();
});
