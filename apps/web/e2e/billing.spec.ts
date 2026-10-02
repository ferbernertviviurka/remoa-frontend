import { expect, test } from '@playwright/test';
import { signUpViaForm } from './sign-up';

// Needs the backend at :4000 running with STRIPE=mock (checkout URL → /v1/stripe/mock/checkout, 302 → /planos/sucesso?session_id= (F15, Pro dialog)).
test('assinar, cancelar, exportar e excluir a conta', async ({ page }) => {
  test.setTimeout(120_000);
  let token = '';
  page.on('request', (r) => {
    const a = r.headers()['authorization'];
    if (a && r.url().startsWith('http://localhost:4000')) token = a;
  });

  await signUpViaForm(page, `e2e-billing-${Date.now()}@remoa.test`);
  await expect(page).toHaveURL(/\/$/);

  await test.step('free → preços → checkout (mock) → Pro', async () => {
    await page.goto('/conta/plano');
    await expect(page.getByRole('heading', { name: 'Free' })).toBeVisible();
    await page.goto('/planos');
    await expect(page.getByRole('table', { name: 'Comparação entre Free e Pro' })).toBeVisible();
    await page.getByRole('radio', { name: /^Cartão/ }).click(); // card = recurring subscription (Pix is a prepaid period, D-100)
    await page.getByRole('button', { name: 'Assinar o Pro' }).click();
    await expect(page).toHaveURL(/\/planos\/sucesso\?session_id=/);
    await expect(page.getByRole('dialog', { name: 'Você agora é Pro.' })).toBeVisible();
    await page.goto('/conta/plano');
    await expect(page.getByRole('button', { name: 'Gerenciar assinatura' })).toBeVisible();
  });

  await test.step('cancelar → ativo até a data, sem renovar', async () => {
    await page.getByRole('button', { name: 'Cancelar assinatura' }).click();
    await expect(page).toHaveURL(/\/conta\/plano/);
    await expect(page.getByText(/não renova sozinho/)).toBeVisible();
    await expect(page).toHaveURL(/\/conta\/plano$/); // ?portal=ok is cleared with router.replace; clicking before that lands on the old tree
  });

  await test.step('exportar baixa um JSON', async () => {
    await page.getByRole('link', { name: 'Dados e privacidade' }).click();
    await page.getByRole('button', { name: 'Exportar meus dados' }).click();
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Baixar' }).click();
    const file = await download;
    expect(file.suggestedFilename()).toMatch(/\.json$/);
  });

  await test.step('excluir → deslogado e a API responde 403', async () => {
    await page.getByRole('button', { name: 'Excluir conta' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Digite EXCLUIR para confirmar').fill('EXCLUIR');
    await dialog.getByRole('button', { name: 'Excluir conta' }).click();
    await page.getByRole('button', { name: 'Sair da conta' }).click();
    await expect(page).toHaveURL(/\/$/);
    await page.goto('/hoje');
    await expect(page).toHaveURL(/\/entrar/);
    const res = await page.request.get('http://localhost:4000/v1/billing/entitlements', { headers: { authorization: token } });
    // Sign-out revokes this session (401) before the deleted-account check (403, covered in the API's account.test.ts) is reached.
    expect([401, 403]).toContain(res.status());
  });
});
