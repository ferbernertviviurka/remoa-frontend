import { expect, test, type Page } from '@playwright/test';
import { accountUser } from '../account/fixture';
import { formReady } from '../sign-up';

// G14 (pontos 4, 5, 11, 12): destino certo + tempo até a tela útil. `PERF=1` imprime os números (D-584..D-587).
test.use({ viewport: { width: 1440, height: 900 } });

async function timed(page: Page, label: string, act: () => Promise<unknown>, ready: () => Promise<unknown>) {
  const t0 = Date.now();
  await act();
  await ready();
  const ms = Date.now() - t0;
  if (process.env.PERF) console.log(`[perf] ${label}: ${ms} ms`);
  return ms;
}

test('avatar → /app/conta/perfil; Sair → /entrar com a sessão encerrada', async ({ page, request }) => {
  await accountUser(page, request);
  await page.goto('/app/hoje');
  await page.waitForLoadState('networkidle'); // prefetch done, as a user who reads the page for a second

  await timed(
    page,
    'avatar → perfil',
    () => page.getByRole('banner').getByRole('link', { name: 'Minha conta' }).click(),
    () => expect(page.getByRole('region', { name: 'Resumo do perfil' })).toBeVisible(),
  );
  await expect(page).toHaveURL(/\/app\/conta\/perfil$/);
  await expect.soft(page.getByRole('banner').getByRole('link', { name: 'Minha conta' })).toHaveAttribute('href', '/app/conta/perfil');

  await timed(
    page,
    'sair → /entrar',
    () => page.getByRole('button', { name: 'Sair da conta' }).click(),
    () => page.waitForURL((u) => !u.pathname.startsWith('/app')).then(() => page.locator('h1, form[data-ready]').first().waitFor()),
  );
  await expect(page).toHaveURL(/\/entrar$/);
  await formReady(page);
  await page.goto('/app/hoje');
  await expect(page).toHaveURL(/\/entrar\?next=/);
});

test('login → Criar conta abre o cadastro', async ({ page }) => {
  await page.goto('/entrar');
  await formReady(page);
  await page.waitForLoadState('networkidle');
  await timed(
    page,
    'entrar → cadastro',
    () => page.getByRole('link', { name: 'Criar conta' }).click(),
    () => page.locator('form[data-ready]').getByLabel('E-mail').waitFor(),
  );
  await expect(page).toHaveURL(/\/cadastro$/);
});

test('logo: deslogado vai para o site, logado vai para Hoje', async ({ page, request }) => {
  await page.goto('/entrar');
  await formReady(page);
  await page.getByRole('link', { name: 'Remoa, ir para a página inicial' }).first().click();
  await expect(page).toHaveURL(/\/$/);

  await accountUser(page, request);
  await page.goto('/');
  const brand = page.getByRole('banner').getByRole('link', { name: 'Remoa, ir para Hoje' });
  await brand.click();
  await expect(page).toHaveURL(/\/app\/hoje$/);
  await page.goto('/app/conta/perfil');
  await page.getByRole('banner').getByRole('link', { name: /Remoa/ }).first().click();
  await expect(page).toHaveURL(/\/app\/hoje$/);
});
