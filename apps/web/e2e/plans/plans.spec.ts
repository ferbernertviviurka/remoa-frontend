// F15 / G05 T8: the Free → Pro journey on /planos against the mock Stripe (STRIPE=mock on the API at :4000).
import { expect, test } from '@playwright/test';
import { API } from '../account/fixture';
import { createSession, events, makeBoards, planUser, subscribe } from './fixture';

test.describe.configure({ mode: 'parallel' });

test('Free com 2 mapas: aviso, anual, FUNDADOR, cartão, overlay, checkout mock e sucesso', async ({ page, request }) => {
  const { headers } = await planUser(page, request);
  await makeBoards(request, headers, 2);
  await page.goto('/app/planos?de=library_lock');

  await expect(page.getByRole('heading', { level: 1, name: 'Seu estudo pede mais espaço?' })).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: 'Você usou 2 de 2 mapas. O Pro libera o resto.' })).toBeVisible();
  await expect.poll(() => events(page)).toContainEqual(expect.objectContaining({ event: 'plans_viewed', props: expect.objectContaining({ from: 'library_lock' }) }));

  const summary = page.getByRole('complementary', { name: 'Resumo do pedido' });
  await expect(summary).toContainText('R$ 39,00');
  await page.getByRole('button', { name: /Anual/ }).click();
  await expect(summary).toContainText('R$ 349,00');
  await expect(summary).toContainText(/Economize/);

  await summary.getByRole('button', { name: 'Tenho um código de fundador' }).click();
  await expect(summary.getByLabel('Código de fundador')).toBeFocused();
  await summary.getByLabel('Código de fundador').fill('FUNDADOR');
  await summary.getByRole('button', { name: 'Aplicar' }).click();
  await expect(summary.getByText('Preço de fundador aplicado')).toBeVisible();
  await expect(summary.getByText('Total hoje')).toBeVisible();

  // D-982: só o cartão está ativo; o Pix fica desabilitado ("Em breve") e o cartão já vem marcado
  await expect(summary.getByRole('radio', { name: /^Pix/ })).toBeDisabled();
  await expect(summary.getByRole('radio', { name: /^Cartão/ })).toBeChecked();
  await summary.getByRole('button', { name: 'Assinar o Pro' }).click();
  await expect(page.getByText('Abrindo o pagamento seguro')).toBeVisible();

  // eventos antes de sair da página (a navegação ao Stripe zera window.__remoaEvents); sem dado pessoal e sem o código
  const ev = await events(page);
  expect(ev.map((e: { event: string }) => e.event)).toContain('checkout_started');
  expect(ev).toContainEqual(expect.objectContaining({ event: 'checkout_started', props: expect.objectContaining({ period: 'annual', method: 'card', coupon: true }) }));
  expect(JSON.stringify(ev)).not.toMatch(/FUNDADOR|@remoa\.test/i);

  await page.waitForURL(/\/planos\/sucesso\?session_id=/);
  await expect(page.getByRole('dialog', { name: 'Você agora é Pro.' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Você agora é Pro.' })).toHaveCount(1); // um só nome acessível, sem repetição para leitor de tela
});

test('cartão no mensal vai ao sucesso e a navbar mostra Pro', async ({ page, request }) => {
  const { headers } = await planUser(page, request);
  await page.goto('/app/planos');
  await page.getByRole('complementary', { name: 'Resumo do pedido' }).getByRole('radio', { name: /^Cartão/ }).click();
  await page.getByRole('button', { name: 'Assinar o Pro' }).click();
  await page.waitForURL(/\/planos\/sucesso/);
  await expect(page.getByRole('dialog', { name: 'Você agora é Pro.' })).toBeVisible();
  const r = await request.get(`${API}/v1/billing/entitlements`, { headers });
  expect((await r.json()).data.plan).toBe('pro');
  await page.getByRole('button', { name: 'Ir para Hoje' }).click();
  await expect(page).toHaveURL(/\/hoje/);
  await expect(page.getByRole('banner')).toContainText('Pro');
});

test('Pix pendente: aguardando, Pro inativo; após pix-confirm vira sucesso', async ({ page, request }) => {
  test.setTimeout(120_000);
  const { headers } = await planUser(page, request);
  const { url, session } = await createSession(request, headers, { period: 'monthly', method: 'pix' });
  await page.goto(`${url}&pix=pending`);
  await expect(page).toHaveURL(/\/planos\/sucesso/);
  await expect(page.getByRole('heading', { name: 'Estamos aguardando a confirmação do Pix' })).toBeVisible();
  expect((await (await request.get(`${API}/v1/billing/entitlements`, { headers })).json()).data.plan).toBe('free');
  await expect.poll(async () => (await events(page)).map((e: { event: string }) => e.event)).toContain('checkout_pending_pix'); // track() é assíncrono em dev

  const c = await request.get(`${API}/v1/stripe/mock/pix-confirm?session=${session}`);
  expect(c.status()).toBe(200);
  await expect(page.getByRole('dialog', { name: 'Você agora é Pro.' })).toBeVisible({ timeout: 15_000 });
  expect((await (await request.get(`${API}/v1/billing/entitlements`, { headers })).json()).data.plan).toBe('pro');
});

test('cancelar volta a /planos?cancelado=1 com aviso', async ({ page, request }) => {
  const { headers } = await planUser(page, request);
  const { session } = await createSession(request, headers, { period: 'monthly', method: 'card' });
  await page.goto(`${API}/v1/stripe/mock/checkout/cancel?session=${session}`);
  await expect(page).toHaveURL(/\/planos/);
  await expect(page.getByText('Pagamento cancelado. Nada foi cobrado.', { exact: true })).toBeVisible();
  await expect(page).toHaveURL(/\/planos$/); // replace() limpa a query
  await expect.poll(async () => (await events(page)).map((e: { event: string }) => e.event)).toContain('checkout_canceled'); // track() é assíncrono em dev
});

test('assinante: gestão, troca para o anual e portal', async ({ page, request }) => {
  const { headers } = await planUser(page, request);
  await subscribe(request, headers, 'monthly', 'card');
  await page.goto('/app/planos');
  await expect(page.getByRole('heading', { level: 1, name: 'Você está no Pro.' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Assinar o Pro' })).toHaveCount(0);
  await expect(page.getByText('No anual você economiza').first()).toBeVisible();
  await page.getByRole('button', { name: 'Mudar para o anual' }).click();
  await expect(page.getByText('No anual você economiza')).toHaveCount(0, { timeout: 45_000 }); // router.refresh em dev é lento sob carga
  const sub = (await (await request.get(`${API}/v1/billing/subscription`, { headers })).json()).data;
  expect(JSON.stringify(sub)).toContain('annual');
  await page.getByRole('button', { name: 'Gerenciar assinatura' }).click();
  await page.waitForURL(/\/conta/);
});

test('cupom inválido mostra erro e não altera o total', async ({ page, request }) => {
  await planUser(page, request);
  await page.goto('/app/planos');
  const summary = page.getByRole('complementary', { name: 'Resumo do pedido' });
  await summary.getByRole('button', { name: 'Tenho um código de fundador' }).click();
  await summary.getByLabel('Código de fundador').fill('NAOEXISTE');
  await summary.getByRole('button', { name: 'Aplicar' }).click();
  await expect(summary.getByText('Código não reconhecido. Confira e tente de novo.')).toBeVisible();
  await expect(summary).toContainText('R$ 39,00');
  const ev = JSON.stringify(await events(page));
  expect(ev).toContain('coupon_failed');
  expect(ev).not.toContain('NAOEXISTE');
});

test('/precos segue público (landing #planos); ?periodo=anual abre no anual; ?de= inválido vira direct', async ({ page, request }) => {
  await page.goto('/precos');
  await expect(page).toHaveURL(/\/#planos$/);
  await planUser(page, request);
  await page.goto('/app/planos?periodo=anual&de=<script>');
  await expect(page.getByRole('complementary', { name: 'Resumo do pedido' })).toContainText('R$ 349,00');
  await expect.poll(() => events(page)).toContainEqual(expect.objectContaining({ event: 'plans_viewed', props: expect.objectContaining({ from: 'direct' }) }));
});

test('FAQ: uma aberta por vez, por teclado, com faq_opened', async ({ page, request }) => {
  await planUser(page, request);
  await page.goto('/app/planos');
  await page.waitForLoadState('networkidle'); // hidratado: Enter antes disso não abre
  const q = page.locator('h3 button[aria-expanded]');
  await expect(q).toHaveCount(4);
  await q.nth(0).focus();
  await page.keyboard.press('Enter');
  await expect(q.nth(0)).toHaveAttribute('aria-expanded', 'true');
  await q.nth(1).focus();
  await page.keyboard.press('Space');
  await expect(q.nth(1)).toHaveAttribute('aria-expanded', 'true');
  await expect(q.nth(0)).toHaveAttribute('aria-expanded', 'false');
  expect((await events(page)).filter((e: { event: string }) => e.event === 'faq_opened')).toHaveLength(2);
});
