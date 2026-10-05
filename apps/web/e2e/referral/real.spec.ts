// F18 T10 (qa): e2e REAL contra a API (:4000, STRIPE=mock) e o Supabase local, sem interceptar /v1/referral. Cobre G12 1-7 e 10.
// O Supabase local confirma o e-mail no cadastro (enable_confirmations = false); o caminho "não confirmado" é forçado por SQL.
import AxeBuilder from '@axe-core/playwright';
import { randomUUID as uuid } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import { referralSummaryFixtures } from '@remoa/contracts/mocks';
import { t } from '@remoa/strings';
import { accountUser, API, psql, secondSession, signUpApi } from '../account/fixture';
import { signUpViaForm } from '../sign-up';
import { fillSignUp, openInvite } from './fixture';

test.use({ viewport: { width: 1440, height: 900 }, colorScheme: 'light' });

const rnd = () => `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
type U = { email: string; id: string; headers: { authorization: string }; code: string };

async function user(request: APIRequestContext, email = `e2e-real-${rnd()}@remoa.test`, name = 'Ana'): Promise<U> {
  const su = await signUpApi(request, email);
  const headers = { authorization: `Bearer ${su.access_token as string}` };
  await request.patch(`${API}/v1/account/profile`, { headers, data: { name } });
  const s = await summary(request, headers);
  return { email, id: su.user.id as string, headers, code: s.code };
}
const summary = async (request: APIRequestContext, headers: { authorization: string }) => {
  const j = await (await request.get(`${API}/v1/referral/summary`, { headers })).json();
  expect(j.ok, JSON.stringify(j)).toBe(true);
  return j.data as { code: string; monthsEarned: number; proUntil: string | null; credit: number; recentRewards: { kind: string; amount: number | null }[]; friends: { status: string; name: string }[]; invitesLeftToday: number };
};
const attribute = (request: APIRequestContext, u: U, code: string) => request.post(`${API}/v1/referral/attribution`, { headers: u.headers, data: { code } });
const plan = async (request: APIRequestContext, u: U) => (await (await request.get(`${API}/v1/billing/entitlements`, { headers: u.headers })).json()).data as { plan: string; grantUntil?: string | null };
const refStatus = (id: string) => psql(`select coalesce(status||':'||coalesce(reject_reason::text,''),'none') from referrals where referee_id='${id}'`);
const grants = (id: string) => Number(psql(`select count(*) from entitlement_grants where user_id='${id}' and revoked_at is null`));

/** Board with `n` cards through the real ops endpoint (qualification runs after the write). */
async function board(request: APIRequestContext, u: U, n = 3) {
  const b = await (await request.post(`${API}/v1/boards`, { headers: u.headers, data: { title: `Mapa ${rnd()}` } })).json();
  expect(b.ok, JSON.stringify(b)).toBe(true);
  const boardId = b.data.id as string;
  const ops = Array.from({ length: n }, (_, i) => ({ op: 'createCard', opId: uuid(), boardId, card: { id: uuid(), type: 'concept', title: `Card ${i}`, position: { x: 100 + i * 220, y: 120 } } }));
  const r = await request.post(`${API}/v1/boards/ops`, { headers: u.headers, data: { ops } });
  expect(r.status(), await r.text()).toBe(200);
  return { boardId, ops };
}
const referred = async (request: APIRequestContext, a: U, email?: string) => {
  const b = await user(request, email, 'Bia');
  expect((await (await attribute(request, b, a.code)).json()).data).toEqual({ attributed: true });
  return b;
};

const axe = async (page: Page) => {
  await page.waitForTimeout(5000);
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).exclude('nextjs-portal').analyze();
  return r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`);
};


const events = (page: Page) => page.evaluate(() => window.__remoaEvents ?? []);
const bearer = async (request: APIRequestContext, email: string) => ({ authorization: `Bearer ${(await secondSession(request, email)).token}` });

test('1. fluxo completo pela UI: A copia o link, B cadastra por /i/<code>, cria o primeiro mapa, os dois ganham 1 mês', async ({ page, browser, request }) => {
  test.setTimeout(240_000);
  await page.clock.install();
  const emailA = `e2e-real-a-${rnd()}@remoa.test`;
  await signUpViaForm(page, emailA);
  await expect(page).toHaveURL(/\/app\/hoje$/);
  await page.goto('/app/indicar?de=direct');
  const link = await page.locator('input[readonly]').first().inputValue();
  expect(link).toMatch(/\/i\/[2-9A-HJKMNP-Z]{8}$/);
  const code = link.split('/i/')[1]!;

  const ctxB = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const pb = await ctxB.newPage();
  const emailB = `e2e-real-b-${rnd()}@remoa.test`;
  await openInvite(pb, code.toLowerCase());
  await expect.poll(async () => (await ctxB.cookies()).find((c) => c.name === 'rf')?.value).toBe(code);
  await fillSignUp(pb, emailB);
  await expect(pb.getByRole('heading', { name: 'Conta criada.' })).toBeVisible();
  const idB = () => psql(`select id from auth.users where email='${emailB}'`);
  await expect.poll(() => refStatus(idB())).toBe('signed_up:');
  expect(psql(`select email_confirmed_at is not null from auth.users where id='${idB()}'`)).toBe('t');
  const idA = psql(`select id from auth.users where email='${emailA}'`);
  const headersA = await bearer(request, emailA);
  expect((await summary(request, headersA)).friends.map((f) => f.status)).toEqual(['signed_up']);

  // B cria o primeiro mapa com 3 cards: qualifica na hora; A está olhando a página (consulta de 30 s)
  const b = { email: emailB, id: idB(), headers: await bearer(request, emailB), code: '' } as U;
  await board(request, b, 3);
  expect(await refStatus(b.id)).toBe('qualified:');
  await page.clock.runFor(31_000);
  await expect(page.getByRole('status').filter({ hasText: 'criou o primeiro mapa' })).toBeVisible();
  await expect(page.getByTestId('reward-months')).toHaveText('1');
  for (const [id, u] of [[idA, { headers: headersA }], [b.id, b]] as const) {
    const e = await plan(request, u as U);
    expect(e.plan, id).toBe('pro');
    const days = (new Date(e.grantUntil!).getTime() - Date.now()) / 86_400_000;
    expect(days).toBeGreaterThan(27);
    expect(days).toBeLessThan(32);
    expect(grants(id)).toBe(1);
  }
  expect(Number(psql(`select count(*) from entitlement_grants where referral_id=(select id from referrals where referee_id='${b.id}')`))).toBe(2);
  // cartão do indicador soma 1 mês; e-mails de recompensa (outbox em memória da API: lido pelo log)
  // API_LOG explícito (log do stdout da API) ou, sem ele, a pasta .emails/ do backend (outbox de dev: um .json por e-mail, `to` = <userId>@test.local)
  const rewardMails = () => {
    if (process.env.API_LOG) return (readFileSync(process.env.API_LOG, 'utf8').match(/email \((?:console|not sent, no RESEND_API_KEY)\).*1 mês de Pro grátis/g) ?? []).length;
    const dir = process.env.EMAILS_DIR ?? '../../../remoa-backend/.emails';
    return readdirSync(dir).filter((f) => f.endsWith('.json') && [idA, b.id].some((id) => readFileSync(`${dir}/${f}`, 'utf8').includes(`"to": "${id}@`)) && f.includes('referral-reward')).length;
  };
  await expect.poll(rewardMails).toBeGreaterThanOrEqual(2);
  await page.reload();
  await expect(page.getByText(t('referral.reward.label'))).toBeVisible();
  await expect(page.getByTestId('reward-months')).toHaveText('1');
  await ctxB.close();
});

test('1b. e-mail não confirmado não qualifica; ao confirmar, a próxima escrita qualifica', async ({ request }) => {
  const a = await user(request);
  const b = await referred(request, a);
  psql(`update auth.users set email_confirmed_at=null where id='${b.id}'`);
  const { boardId } = await board(request, b, 3);
  expect(await refStatus(b.id)).toBe('signed_up:');
  expect(await plan(request, b)).toMatchObject({ plan: 'free' });
  psql(`update auth.users set email_confirmed_at=now() where id='${b.id}'`);
  await request.post(`${API}/v1/boards/ops`, { headers: b.headers, data: { ops: [{ op: 'createCard', opId: uuid(), boardId, card: { id: uuid(), type: 'concept', title: 'Mais um', position: { x: 10, y: 10 } } }] } });
  expect(await refStatus(b.id)).toBe('qualified:');
  expect((await plan(request, a)).plan).toBe('pro');
});

test('2. assinante mensal e anual: crédito 3900 / 2908 no Stripe (mock), sem concessão sobreposta', async ({ request }) => {
  for (const [period, cents] of [['monthly', 3900], ['annual', 2908]] as const) {
    const a = await user(request);
    const co = await (await request.post(`${API}/v1/billing/checkout`, { headers: a.headers, data: { period, method: 'card' } })).json();
    expect(co.ok, JSON.stringify(co)).toBe(true);
    await request.get(co.data.url, { maxRedirects: 0 });
    await expect.poll(async () => (await plan(request, a)).plan).toBe('pro');
    const b = await referred(request, a);
    await board(request, b, 3);
    expect(await refStatus(b.id)).toBe('qualified:');
    expect(psql(`select amount_cents||':'||currency||':'||(applied_at is not null)||':'||(stripe_balance_txn_id is not null) from billing_credits where user_id='${a.id}'`)).toBe(`${cents}:brl:true:true`);
    expect(grants(a.id)).toBe(0); // FR-19: assinante não recebe concessão
    expect(grants(b.id)).toBe(1); // o indicado (Free) recebe o mês
    const s = await summary(request, a.headers);
    expect(s.credit).toBe(cents);
    expect(s.recentRewards[0]).toMatchObject({ kind: 'credit', amount: cents });
  }
});

test('3. antifraude: autoindicação (Gmail com pontos e +tag), descartável e limite de 10 em 30 dias viram rejected sem concessão e sem aparecer', async ({ request }) => {
  const g = rnd().replace(/\W/g, '');
  const a = await user(request, `e2e.dot${g}@gmail.com`);
  const self = await referred(request, a, `e2edot${g}+x@gmail.com`);
  await board(request, self, 3);
  expect(await refStatus(self.id)).toBe('rejected:self_referral');
  const disp = await referred(request, a, `e2e${g}@mailinator.com`);
  await board(request, disp, 3);
  expect(await refStatus(disp.id)).toMatch(/^rejected:disposable_email/);
  for (const u of [self, disp]) expect(grants(u.id)).toBe(0);
  expect(grants(a.id)).toBe(0);
  expect(await plan(request, a)).toMatchObject({ plan: 'free' });
  const s = await summary(request, a.headers);
  expect(JSON.stringify(s)).not.toMatch(/rejected|self_referral|disposable/);
  expect(s.friends.map((f) => f.status).filter((x) => x === 'qualified' || x === 'signed_up')).toEqual(expect.any(Array));
  expect(s.monthsEarned).toBe(0);

  const v = await user(request);
  for (let i = 0; i < 10; i++) psql(`insert into referrals (referrer_id, channel, status, qualified_at, signed_up_at) values ('${v.id}','link','qualified', now() - interval '2 days', now() - interval '3 days')`);
  const over = await referred(request, v);
  await board(request, over, 3);
  expect(await refStatus(over.id)).toBe('rejected:velocity_limit');
  expect(grants(over.id)).toBe(0);
  expect(JSON.stringify((await summary(request, v.headers)).friends)).not.toMatch(/rejected|velocity/);
});

test('4. convites por e-mail: até 5 por envio, 20 por dia, máscara na lista, nada em claro no banco', async ({ request }) => {
  const a = await user(request);
  const tag = `zq${rnd().replace(/\W/g, '')}`;
  const send = (emails: string[]) => request.post(`${API}/v1/referral/invites`, { headers: a.headers, data: { emails } });
  const batch = (n: number, k: number) => Array.from({ length: n }, (_, i) => `${tag}x${k}${i}@exemplo.com`);
  expect((await send(batch(6, 9))).status()).toBe(422);
  expect((await send(['nao-e-email'])).status()).toBe(422);
  for (let k = 0; k < 4; k++) expect((await send(batch(5, k))).status()).toBe(200);
  const over = await send(batch(1, 7));
  expect(over.status()).toBe(429);
  expect((await over.json()).error.message).toBe('invite_daily_limit');
  const s = await summary(request, a.headers);
  expect(s.invitesLeftToday).toBe(0);
  const raw = JSON.stringify(s.friends);
  expect(raw).not.toContain(tag);
  expect(raw).toMatch(/\*/);
  expect(psql(`select count(*) from referrals where referrer_id='${a.id}' and channel='email'`)).toBe('20');
  expect(psql(`select count(*) from (select r::text t from referrals r where referrer_id='${a.id}') x where t ilike '%${tag}%'`)).toBe('0');
  expect(psql(`select count(*) from referrals where referrer_id='${a.id}' and invited_email_hash ~ '^[0-9a-f]{64}$'`)).toBe('20');
});

test('5. idempotência: qualificações simultâneas e repetidas geram 1 par de concessões', async ({ request }) => {
  const a = await user(request);
  const b = await referred(request, a);
  const { boardId } = await board(request, b, 3);
  const more = () => request.post(`${API}/v1/boards/ops`, { headers: b.headers, data: { ops: [{ op: 'createCard', opId: uuid(), boardId, card: { id: uuid(), type: 'concept', title: 'x', position: { x: 5, y: 5 } } }] } });
  await Promise.all([more(), more(), more(), more()]);
  expect(Number(psql(`select count(*) from entitlement_grants where referral_id=(select id from referrals where referee_id='${b.id}')`))).toBe(2);
  expect(grants(a.id)).toBe(1);
  expect(grants(b.id)).toBe(1);
  expect((await summary(request, a.headers)).monthsEarned).toBe(1);
  // ao acabar o último mês: volta ao Free e os dados ficam
  psql(`update entitlement_grants set starts_at = now() - interval '40 days', ends_at = now() - interval '10 days' where user_id='${b.id}'`);
  expect(await plan(request, b)).toMatchObject({ plan: 'free' });
  expect(((await (await request.get(`${API}/v1/boards/${boardId}`, { headers: b.headers })).json()).data.cards as unknown[]).length).toBeGreaterThanOrEqual(3);
});

test('6. Founder nunca é rebaixado pela concessão de Pro', async ({ request }) => {
  const a = await user(request);
  psql(`insert into subscriptions (user_id, plan, status) values ('${a.id}','founder','active') on conflict (user_id) do update set plan='founder', status='active'`);
  expect((await plan(request, a)).plan).toBe('founder');
  const b = await referred(request, a);
  await board(request, b, 3);
  expect(await refStatus(b.id)).toBe('qualified:');
  expect((await plan(request, a)).plan).toBe('founder');
  expect((await plan(request, b)).plan).toBe('pro');
  // founder como indicado
  const c = await user(request);
  const f = await user(request);
  psql(`insert into subscriptions (user_id, plan, status) values ('${f.id}','founder','active') on conflict (user_id) do update set plan='founder', status='active'`);
  expect((await attribute(request, f, c.code)).ok()).toBe(true);
  await board(request, f, 3);
  expect((await plan(request, f)).plan).toBe('founder');
});

test('7. pontos de entrada levam a /app/indicar?de=<origem>', async ({ page, request }) => {
  await accountUser(page, request);
  const go = async (from: string, open: () => Promise<void>, to: string) => {
    await page.goto(from);
    await open();
    await expect(page).toHaveURL(new RegExp(`/app/indicar\\?de=${to}$`));
    await expect.poll(async () => (await events(page)).find((e) => e.event === 'referral_page_viewed')?.props).toMatchObject({ from: to });
  };
  await go('/app/hoje', () => page.getByRole('button', { name: t('referral.navCta') }).first().click(), 'navbar');
  await go('/app/hoje', () => page.getByRole('link', { name: new RegExp(t('referral.homeCard')) }).click(), 'home');
  await go('/app/planos', () => page.getByRole('region', { name: t('referral.plansPromo') }).getByRole('button').click(), 'plans');
  await go('/app/conta/plano', () => page.getByRole('button', { name: t('referral.accountEntryCta') }).click(), 'account');
  await go('/app/hoje', async () => { await page.getByRole('button', { name: t('nav.planChip.aria') }).click(); await page.getByRole('button', { name: t('referral.panelLink') }).click(); }, 'plan_panel');
});

test('8+10. a11y (vazio, andamento, Pro, convite logado), lista principal, movimento reduzido e telemetria sem dado pessoal', async ({ page, request }) => {
  test.setTimeout(180_000);
  const a = await accountUser(page, request);
  const A = { email: a.email, id: a.userId, headers: a.headers, code: (await summary(request, a.headers)).code };
  await page.goto('/app/indicar?de=direct');
  await expect(page.getByRole('heading', { name: t('referral.link.title') })).toBeVisible();
  expect(await axe(page), 'vazio').toEqual([]);

  const b = await referred(request, A, `e2e-real-fulano-${rnd()}@remoa.test`);
  await page.reload();
  await expect(page.getByRole('list').filter({ hasText: 'Bia' }).first()).toBeVisible(); // lista = representação principal
  expect(await axe(page), 'andamento').toEqual([]);
  await page.getByRole('button', { name: /Bia/ }).first().click();
  expect(await axe(page), 'andamento + detalhe').toEqual([]);

  await board(request, b, 3);
  await page.reload();
  await expect(page.getByTestId('reward-months')).toHaveText('1');
  expect(await axe(page), 'Pro').toEqual([]);
  await page.getByRole('button', { name: /Copiar/ }).first().click();
  await expect(page.locator('[aria-live]').filter({ hasText: /Copiado/ }).first()).toBeAttached();

  // /i/<code> com a sessão ativa
  await page.goto(`/i/${A.code}`);
  await expect(page.getByText('Você já tem conta')).toBeVisible();
  expect(await axe(page), 'convite logado').toEqual([]);

  // movimento reduzido do sistema: quadro final, nada animando
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/app/indicar');
  await expect(page.getByTestId('reward-months')).toHaveText('1');
  const animating = await page.evaluate(() => document.getAnimations().filter((x) => x.playState === 'running').length);
  expect(animating).toBe(0);

  // telemetria: nenhuma propriedade com e-mail, nome ou código
  const all = JSON.stringify(await events(page));
  expect(all).not.toMatch(/@remoa\.test|Bia|Ana|Marina/);
  expect(all).not.toContain(A.code);
  expect((await events(page)).filter((e) => e.event.startsWith('referral_')).length).toBeGreaterThan(0);
});

test('9. "Reduzir movimento" da Conta (F13) mostra o estado final em /app/indicar', async ({ page, request }) => {
  await accountUser(page, request);
  await page.goto('/app/conta/preferencias');
  await page.getByRole('switch', { name: 'Reduzir movimento' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduced');
  await page.goto('/app/indicar');
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduced');
  await expect(page.getByTestId('reward-months')).toHaveText('0');
  await page.waitForTimeout(1500);
  expect(await page.evaluate(() => document.getAnimations().filter((x) => x.playState === 'running').length)).toBe(0);
  await expect(page.getByTestId('referral-hero-art').getByText(t('referral.page.heroReward'))).toHaveCSS('opacity', '1');
});

test('8b. a11y no estado "muitos" (lista longa, summary simulado só neste teste: o real exigiria 30 contas)', async ({ page, request }) => {
  await accountUser(page, request);
  const cors = { 'access-control-allow-origin': `http://localhost:${process.env.PORT ?? 3000}`, 'access-control-allow-headers': 'authorization,content-type', 'access-control-allow-methods': 'GET,POST,OPTIONS' };
  await page.route('**/v1/referral/summary', (r) => (r.request().method() === 'OPTIONS' ? r.fulfill({ status: 204, headers: cors }) : r.fulfill({ status: 200, headers: { ...cors, 'content-type': 'application/json' }, body: JSON.stringify({ ok: true, data: referralSummaryFixtures.many }) })));
  await page.goto('/app/indicar');
  await expect(page.getByRole('heading', { name: t('referral.link.title') })).toBeVisible();
  expect(await axe(page)).toEqual([]);
});
