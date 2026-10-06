// F18 T5/T6: /app/indicar com o summary simulado no navegador (a API de indicação é do backend, em paralelo), axe, movimento reduzido e
// baselines 1440x900 dos 5 estados do mock (indicar-{andamento,vazio,muitos,pro,recompensa}.png). Só darwin para os baselines.
// Update só de propósito: `pnpm test:e2e e2e/referral --update-snapshots`.
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { referralSummaryFixtures } from '@remoa/contracts/mocks';
import { t } from '@remoa/strings/full';
import { accountUser } from '../account/fixture';

test.use({ viewport: { width: 1440, height: 900 }, colorScheme: 'light' });

type Summary = (typeof referralSummaryFixtures)[keyof typeof referralSummaryFixtures];
const cors = { 'access-control-allow-origin': `http://localhost:${process.env.PORT ?? 3000}`, 'access-control-allow-headers': 'authorization,content-type', 'access-control-allow-methods': 'GET,POST,OPTIONS' };

/** Responde GET /v1/referral/summary e POST /v1/referral/invites; `state.summary` pode mudar durante o teste. */
async function mockApi(page: Page, initial: Summary) {
  const state = { summary: structuredClone(initial) as Summary, invites: [] as string[][], limit: false };
  await page.route('**/v1/referral/**', async (route) => {
    const req = route.request();
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    const json = (status: number, body: unknown) => route.fulfill({ status, headers: { ...cors, 'content-type': 'application/json' }, body: JSON.stringify(body) });
    if (req.url().endsWith('/summary')) return json(200, { ok: true, data: state.summary });
    if (state.limit) return json(429, { error: { code: 'rate_limited', message: 'invite_daily_limit' } });
    const emails = (req.postDataJSON() as { emails: string[] }).emails;
    state.invites.push(emails);
    return json(200, { ok: true, data: { sent: emails.length, invitesLeftToday: 10 } });
  });
  return state;
}
const events = (page: Page) => page.evaluate(() => window.__remoaEvents ?? []);

test.describe('/app/indicar', () => {
  test('copiar, compartilhar, convidar por e-mail e selecionar amigos, com telemetria', async ({ page, request, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await accountUser(page, request);
    const state = await mockApi(page, referralSummaryFixtures.inProgress);
    await context.route('https://wa.me/**', (r) => r.fulfill({ status: 200, contentType: 'text/html', body: 'ok' }));
    await page.goto('/app/indicar?de=navbar');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('1 mês de Pro');

    await page.getByRole('button', { name: t('referral.link.copy') }).click();
    await expect(page.getByRole('button', { name: t('referral.link.copied') })).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(state.summary.link);

    const popup = page.waitForEvent('popup');
    await page.getByRole('button', { name: t('referral.share.whatsapp') }).click();
    expect((await popup).url()).toContain('https://wa.me/?text=');

    const input = page.getByLabel(t('referral.page.emailLabel'));
    await input.fill('colega@email.com');
    await page.getByRole('button', { name: t('referral.emailInvite.add') }).click();
    await page.getByRole('button', { name: t('referral.emailInvite.send', { count: 1 }) }).click();
    await expect(page.getByText(t('referral.page.invitesSent', { count: 1 }))).toBeVisible();
    expect(state.invites).toEqual([['colega@email.com']]);

    const list = page.getByRole('list', { name: t('referral.friends.label') });
    await list.getByRole('button').first().click();
    await expect(list.getByRole('button').first()).toHaveAttribute('aria-pressed', 'true');

    const sent = (await events(page)).map((e) => e.event);
    for (const e of ['referral_page_viewed', 'referral_link_copied', 'referral_share_clicked', 'referral_invites_sent', 'referral_friend_selected']) expect(sent).toContain(e);
    expect((await events(page)).find((e) => e.event === 'referral_page_viewed')?.props).toMatchObject({ from: 'navbar' });
  });

  test('o convite recusado pelo limite diário trava o campo', async ({ page, request }) => {
    await accountUser(page, request);
    const state = await mockApi(page, referralSummaryFixtures.inProgress);
    state.limit = true;
    await page.goto('/app/indicar');
    await page.getByLabel(t('referral.page.emailLabel')).fill('colega@email.com');
    await page.getByRole('button', { name: t('referral.emailInvite.add') }).click();
    await page.getByRole('button', { name: t('referral.emailInvite.send', { count: 1 }) }).click();
    await expect(page.getByRole('alert').filter({ hasText: t('referral.emailInvite.limitReached') })).toBeVisible();
    await expect(page.getByLabel(t('referral.page.emailLabel'))).toBeDisabled();
  });

  test('a consulta de 30 s detecta a recompensa: aviso, nó, selo e total', async ({ page, request }) => {
    await page.clock.install();
    await accountUser(page, request);
    const state = await mockApi(page, referralSummaryFixtures.inProgress);
    await page.goto('/app/indicar');
    await expect(page.getByRole('heading', { name: t('referral.link.title') })).toBeVisible();
    const next = structuredClone(state.summary);
    next.friends = next.friends.map((f) => (f.displayName === 'Marina C.' ? { ...f, status: 'qualified' as const } : f));
    next.monthsEarned = 2;
    state.summary = next;
    await page.clock.runFor(31_000);
    await expect(page.getByRole('status').filter({ hasText: t('referral.reward_moment.notification', { name: 'Marina C.' }) })).toBeVisible();
    await expect(page.locator('[data-testid="referral-map"] [data-edge="qualified"]')).toHaveCount(2);
    await expect.poll(async () => (await events(page)).map((e) => e.event)).toContain('referral_reward_seen');
  });

  test('axe sem violações (andamento, vazio)', async ({ page, request }) => {
    await accountUser(page, request);
    const state = await mockApi(page, referralSummaryFixtures.inProgress);
    for (const s of [referralSummaryFixtures.inProgress, referralSummaryFixtures.empty]) {
      state.summary = s;
      await page.goto('/app/indicar');
      await expect(page.getByRole('heading', { name: t('referral.link.title') })).toBeVisible();
      await page.waitForTimeout(2800); // cascata do mapa e herói
      const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
      expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`)).toEqual([]);
    }
  });

  test('movimento reduzido mostra o quadro final (herói e total sem contagem)', async ({ page, request }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await accountUser(page, request);
    await mockApi(page, referralSummaryFixtures.inProgress);
    await page.goto('/app/indicar');
    await expect(page.getByTestId('reward-months')).toHaveText('1');
    // inside <main>: while the RSC stream swaps the Suspense boundary a hidden copy of the hero can exist outside it (strict-mode flake)
    const art = page.getByRole('main').getByTestId('referral-hero-art');
    await expect(art.getByText(t('referral.page.heroReward'))).toHaveCSS('opacity', '1');
  });

  test.describe('visual 1440x900', () => {
    test.skip(process.platform !== 'darwin', 'baselines só em darwin');
    const shots = [
      ['andamento', referralSummaryFixtures.inProgress],
      ['vazio', referralSummaryFixtures.empty],
      ['muitos', referralSummaryFixtures.many],
      ['pro', referralSummaryFixtures.pro],
    ] as const;
    for (const [name, fixture] of shots) {
      test(name, async ({ page, request }) => {
        await accountUser(page, request);
        await mockApi(page, fixture);
        await page.goto('/app/indicar');
        await expect(page.getByRole('heading', { name: t('referral.link.title') })).toBeVisible();
        await page.waitForTimeout(3600); // herói 2,2 s + contagem do total + barras
        await page.mouse.move(2, 2);
        await page.addStyleTag({ content: 'nextjs-portal{display:none!important}' });
        const opts = { animations: 'allow' as const, maxDiffPixelRatio: 0.03, mask: [page.getByText(/Faltam \d+ dias/), page.getByText(/^Pro grátis até/)] };
        await expect(page).toHaveScreenshot(`indicar-${name}.png`, opts);
        // o mapa e a lista (as revelações por rolagem só chegam ao quadro final dentro da tela; por isso não é fullPage)
        await page.getByRole('heading', { name: t('referral.map.title') }).scrollIntoViewIfNeeded();
        await page.mouse.wheel(0, 200);
        await page.waitForTimeout(2600);
        await expect(page).toHaveScreenshot(`indicar-${name}-mapa.png`, opts);
      });
    }
    test('recompensa', async ({ page, request }) => {
      await page.clock.install();
      await accountUser(page, request);
      const state = await mockApi(page, referralSummaryFixtures.inProgress);
      await page.goto('/app/indicar');
      await expect(page.getByRole('heading', { name: t('referral.link.title') })).toBeVisible();
      state.summary = { ...structuredClone(state.summary), monthsEarned: 3, friends: state.summary.friends.map((f) => (f.displayName === 'Marina C.' ? { ...f, status: 'qualified' as const } : f)) };
      await page.clock.runFor(31_000);
      await expect(page.getByRole('status').filter({ hasText: 'Marina C.' })).toBeVisible();
      await page.clock.runFor(4_000);
      await page.mouse.move(2, 2);
      await page.addStyleTag({ content: 'nextjs-portal{display:none!important}' });
      await expect(page).toHaveScreenshot('indicar-recompensa.png', { animations: 'allow', maxDiffPixelRatio: 0.03, mask: [page.getByTestId('referral-hero-art'), page.locator('#referral-hero-title'), page.locator('nextjs-portal'), page.getByText(/Faltam \d+ dias/), page.getByText(/^Pro grátis até/)] });
    });
  });
});
