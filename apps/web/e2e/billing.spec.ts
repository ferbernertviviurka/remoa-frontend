import { expect, test } from '@playwright/test';

// Needs the backend at :4000 running with STRIPE=mock (checkout URL → /v1/stripe/mock/checkout, 302 → /conta?checkout=ok).
test('assinar, cancelar, exportar e excluir a conta', async ({ page }) => {
  test.setTimeout(120_000);
  let token = '';
  page.on('request', (r) => {
    const a = r.headers()['authorization'];
    if (a && r.url().startsWith('http://localhost:4000')) token = a;
  });

  await page.goto('/cadastro');
  await page.getByLabel('E-mail').fill(`e2e-billing-${Date.now()}@remoa.test`);
  await page.getByLabel('Senha').fill('senha-forte-123');
  await page.getByRole('button', { name: 'Criar conta' }).click();
  await expect(page).toHaveURL(/\/$/);

  await test.step('free → preços → checkout (mock) → Pro', async () => {
    await page.goto('/conta');
    await expect(page.getByRole('heading', { name: 'Free' }).or(page.getByText('Free', { exact: true }))).toBeVisible();
    await page.goto('/precos');
    await expect(page.getByRole('table', { name: 'Comparação entre Free e Pro' })).toBeVisible();
    await page.getByText('Cartão', { exact: true }).click(); // card = recurring subscription (Pix is a prepaid period, D-100)
    await page.getByRole('button', { name: 'Assinar o Pro' }).click();
    await expect(page).toHaveURL(/\/conta/);
    await expect(page.getByText('Assinatura ativada. Bem-vindo ao Pro.', { exact: true })).toBeVisible();
    await expect(page.getByText('Pro', { exact: true })).toBeVisible();
  });

  await test.step('cancelar → ativo até a data, sem renovar', async () => {
    await page.getByRole('button', { name: 'Cancelar assinatura' }).click();
    await expect(page).toHaveURL(/\/conta/);
    await expect(page.getByText(/não renova sozinho/)).toBeVisible();
    await expect(page).toHaveURL(/\/conta$/); // ?portal=ok is cleared with router.replace; clicking before that lands on the old tree
  });

  await test.step('exportar baixa um JSON', async () => {
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Exportar meus dados' }).click();
    const file = await download;
    expect(file.suggestedFilename()).toMatch(/\.json$/);
  });

  await test.step('excluir → deslogado e a API responde 403', async () => {
    await page.getByRole('button', { name: 'Excluir conta' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Excluir minha conta' }).click();
    await expect(page).toHaveURL(/\/$/);
    await page.goto('/hoje');
    await expect(page).toHaveURL(/\/entrar/);
    const res = await page.request.get('http://localhost:4000/v1/billing/entitlements', { headers: { authorization: token } });
    // Sign-out revokes this session (401) before the deleted-account check (403, covered in the API's account.test.ts) is reached.
    expect([401, 403]).toContain(res.status());
  });
});
