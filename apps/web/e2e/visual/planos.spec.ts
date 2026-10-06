// F15 / G05 T8: baselines 1440x900 (toHaveScreenshot) de /planos: Free, anual + fundador, Pro, "Abrindo o pagamento seguro" e sucesso.
// Só darwin. Update só de propósito: `pnpm test:e2e e2e/visual/planos --update-snapshots`.
// O lado a lado contra docs/design/v2/screens/planos-*.png está em docs/g05-lado-a-lado/ (SAVE_PAIRS=1 grava os "app-*.png" ali).
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { API } from '../account/fixture';
import { createSession, planUser } from '../plans/fixture';

test.use({ viewport: { width: 1440, height: 900 }, colorScheme: 'light' });
test.skip(process.platform !== 'darwin', 'baselines só em darwin');

const PAIRS = join(process.cwd(), '../../../docs/g05-lado-a-lado');

/** 2 mapas e 44 cards (o mock mostra "Você usa 44 de 200"; o Free do produto é 50, D-167). */
async function freeLikeMock(page: Page, request: Parameters<typeof planUser>[1]) {
  const u = await planUser(page, request);
  for (const [b, n] of [[0, 22], [1, 22]] as const) {
    const board = (await (await request.post(`${API}/v1/boards`, { headers: u.headers, data: { title: `Mapa ${b + 1}` } })).json()).data.id as string;
    const ops = Array.from({ length: n }, (_, i) => ({ op: 'createCard', opId: crypto.randomUUID(), boardId: board, card: { id: crypto.randomUUID(), type: 'concept', title: `Card ${b}-${i}`, position: { x: i * 20, y: b * 20 } } }));
    expect((await request.post(`${API}/v1/boards/ops`, { headers: u.headers, data: { ops } })).status()).toBe(200);
  }
  return u;
}

async function shot(page: Page, name: string, idle = true) {
  if (idle) await page.waitForLoadState('networkidle'); // não com o checkout pendurado (redirecionando)
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => scrollTo(0, 0));
  await page.mouse.move(2, 2);
  await page.waitForTimeout(1600); // slide 450 ms + cascata 70 ms + barras 900 ms
  const volatile = [
    page.getByText(/Próxima cobrança em/), // data relativa ao dia
    page.locator('dl dd').filter({ hasText: /de 20\d\d$/ }), // "Renova em"
    page.locator('nextjs-portal'),
    page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: /Revisar/ }), // badge = default queue (hub cached 60 s on the API: present or not)
  ];
  if (process.env.SAVE_PAIRS) {
    mkdirSync(PAIRS, { recursive: true });
    await page.screenshot({ path: join(PAIRS, `app-${name}.png`), animations: 'disabled' });
  }
  await expect(page).toHaveScreenshot(`planos-${name}.png`, { mask: volatile, animations: 'disabled', stylePath: 'e2e/visual/hide-dev-badge.css', maxDiffPixelRatio: 0.02 });
}

test('visual planos: Free, anual + fundador, Pro, redirecionando e sucesso', async ({ page, request }) => {
  test.setTimeout(240_000);
  await freeLikeMock(page, request);
  await page.goto('/app/planos');
  await expect(page.getByRole('table', { name: 'Comparação entre Free e Pro' })).toBeVisible();
  await shot(page, 'free');

  await page.getByRole('radio', { name: /Anual/ }).or(page.getByRole('button', { name: /Anual/ })).first().click();
  const s = page.getByRole('complementary', { name: 'Resumo do pedido' });
  await s.getByRole('button', { name: 'Tenho um código de fundador' }).click();
  await s.getByLabel('Código de fundador').fill('FUNDADOR');
  await s.getByRole('button', { name: 'Aplicar' }).click();
  await expect(s.getByText('Preço de fundador aplicado')).toBeVisible();
  await shot(page, 'anual-fundador');

  // redirecionando (Mensal + cartão): a criação da sessão fica pendurada para o overlay ficar parado
  await page.goto('/app/planos');
  await expect(page.getByRole('table', { name: 'Comparação entre Free e Pro' })).toBeVisible();
  await page.route('**/v1/billing/checkout', () => new Promise(() => undefined));
  await page.getByRole('button', { name: 'Assinar o Pro' }).click();
  await expect(page.getByText('Abrindo o pagamento seguro')).toBeVisible();
  await shot(page, 'redirecionando', false);
  // no `unroute` here: Playwright continues a held request when its route is removed, so the click's POST would reach the API, the page would
  // follow the mock URL and subscribe the user, and the next createSession would answer 409 ("already subscribed"). The route dies with the page.

  // sucesso: o checkout mock completa o cartão e o retorno mostra o diálogo sobre a página já Pro
  // P-362: the API's mock checkout intermittently answers 500 (pg_advisory_xact_lock "grant:<user>" fails after ~1 s, backend); a new session retries it.
  // Only the session creation + completion is retried: once the mock completes, the user is Pro and a second checkout answers 409.
  let back = '';
  await expect(async () => {
    const { url } = await createSession(request, (await planUserHeaders(page)), { period: 'monthly', method: 'card' });
    const r = await request.get(url, { maxRedirects: 0 });
    expect(r.status()).toBe(302);
    back = r.headers().location!;
  }).toPass({ timeout: 60_000 });
  await page.goto(back);
  await expect(page.getByRole('dialog', { name: 'Você agora é Pro.' })).toBeVisible({ timeout: 30_000 });
  await shot(page, 'sucesso');

  await page.goto('/app/planos');
  await expect(page.getByRole('heading', { level: 1, name: 'Você está no Pro.' })).toBeVisible();
  await shot(page, 'pro');
});

/** Bearer of the logged-in cookie session, for API calls on the same user. */
async function planUserHeaders(page: Page) {
  const cookies = await page.context().cookies();
  const raw = cookies.filter((c) => c.name.includes('auth-token')).sort((a, b) => a.name.localeCompare(b.name)).map((c) => c.value).join('');
  const json = JSON.parse(Buffer.from(raw.replace(/^base64-/, ''), 'base64url').toString()) as { access_token: string };
  return { authorization: `Bearer ${json.access_token}` };
}
