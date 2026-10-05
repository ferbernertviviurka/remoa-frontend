import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { formReady, signUpViaForm } from './sign-up';

// G10 (D-320): a sessão se mantém. Cada caso falha sem a correção correspondente.
const password = 'senha-forte-123';

async function signIn(page: Page, email: string) {
  await page.goto('/entrar');
  await formReady(page);
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha').fill(password);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).toHaveURL(/\/app\/hoje$/);
}

/** Marca o access token como vencido no cookie (o que o navegador tem depois de 1 h parado). */
async function expireAccessToken(context: BrowserContext) {
  const auth = (await context.cookies()).find((c) => /^sb-.+-auth-token$/.test(c.name));
  expect(auth, 'cookie de sessão').toBeTruthy();
  const session = JSON.parse(Buffer.from(auth!.value.replace(/^base64-/, ''), 'base64url').toString());
  session.expires_at = Math.floor(Date.now() / 1000) - 60;
  await context.addCookies([{ ...auth!, value: `base64-${Buffer.from(JSON.stringify(session)).toString('base64url')}` }]);
}

test('logado: / é a landing com CTA para /app; /entrar e /cadastro voltam para o app; token vencido renova', async ({ page, context }) => {
  await signUpViaForm(page, `e2e-sessao-${Date.now()}@remoa.test`);
  await expect(page).toHaveURL(/\/app\/hoje$/);

  await page.goto('/');
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('link', { name: 'Entrar', exact: true })).toHaveCount(0);
  await page.getByRole('banner').getByRole('link', { name: 'Continuar estudando' }).first().click();
  await expect(page).toHaveURL(/\/app\/hoje$/);

  for (const form of ['/entrar', '/cadastro']) {
    await page.goto(form);
    await expect(page, form).toHaveURL(/\/app\/hoje$/);
  }
  await page.goto('/entrar?next=%2Fapp%2Fmapas');
  await expect(page).toHaveURL(/\/app\/mapas$/);

  await expireAccessToken(context);
  await page.goto('/app/mapas');
  await expect(page).toHaveURL(/\/app\/mapas$/);
  await page.reload();
  await expect(page).toHaveURL(/\/app\/mapas$/);
  const tab = await context.newPage();
  await page.close();
  await tab.goto('/app/hoje');
  await expect(tab).toHaveURL(/\/app\/hoje$/);
});

test('sair num aparelho não derruba a sessão do outro', async ({ page, browser }) => {
  const email = `e2e-sessao2-${Date.now()}@remoa.test`;
  await signUpViaForm(page, email);
  await expect(page).toHaveURL(/\/app\/hoje$/);

  const other = await browser.newContext();
  const phone = await other.newPage();
  await signIn(phone, email);
  await phone.goto('/app/conta');
  await phone.waitForLoadState('networkidle'); // the button is client-only: a click before hydration is lost
  await phone.getByRole('button', { name: 'Sair' }).click();
  await expect(phone).toHaveURL(/\/entrar$/); // G14 D-585
  await other.close();

  await page.goto('/app/mapas');
  await expect(page).toHaveURL(/\/app\/mapas$/);
});
