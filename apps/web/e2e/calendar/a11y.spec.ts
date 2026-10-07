// G18 QA: axe nas telas novas (Calendário nas 4 visões, modal, gaveta, tutorial; Notificações; popover do sino; Hoje), teclado, movimento reduzido e alvos de toque.
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { API, accountUser, psql } from '../account/fixture';

const TZ = 'America/Sao_Paulo';
const ymd = (o: number) => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date(Date.now() + o * 86_400_000));
const axe = async (page: Page, scope?: string) => {
  await page.waitForTimeout(300);
  await page.evaluate(() => Promise.all(document.getAnimations().filter((a) => a.effect?.getTiming().iterations !== Infinity).map((a) => a.finished.catch(() => null)))); // axe lê opacidade no meio das entradas escalonadas
  const b = new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).exclude('nextjs-portal');
  const r = await (scope ? b.include(scope) : b).analyze(); // scope: com um diálogo modal aberto, o que está atrás fica sob o véu e o axe não calcula o contraste dele
  return r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`);
};
const seedEvents = async (request: Parameters<typeof accountUser>[1], headers: { authorization: string }) => {
  const labels = (await (await request.get(`${API}/v1/calendar/labels`, { headers })).json()).data.labels as { id: string; systemKey: string | null }[];
  for (const [i, o] of [1, 2, 4, 9].entries())
    await request.post(`${API}/v1/calendar/events`, { headers, data: { title: `Compromisso ${i + 1}`, labelId: labels[i]!.id, date: ymd(o), startTime: '08:00', location: 'Sala 204' } });
};
const noViolations = async (page: Page, what: string, scope?: string) => expect(await axe(page, scope), what).toEqual([]);

test.describe('desktop', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('axe: calendário (tutorial, 4 visões, modal, gaveta) e teclado', async ({ page, request }) => {
    test.setTimeout(240_000);
    const { headers } = await accountUser(page, request);
    await seedEvents(request, headers);
    await page.goto('/app/calendario');
    const tour = page.getByRole('dialog', { name: 'Como o calendário funciona' });
    await expect(tour).toBeVisible();
    await noViolations(page, 'tutorial', '[role=dialog]');
    await page.keyboard.press('Escape');
    await expect(tour).toBeHidden();

    const grid = page.getByRole('grid', { name: 'Calendário do mês' });
    await expect(grid).toBeVisible();
    await noViolations(page, 'mês');
    // teclado: setas movem o foco entre os dias; Esc fecha o modal
    await grid.getByRole('gridcell').first().focus();
    const focusedDay = () => page.evaluate(() => document.activeElement?.getAttribute('aria-label') ?? document.activeElement?.textContent ?? '');
    const d0 = await focusedDay();
    await page.keyboard.press('ArrowRight');
    expect(await focusedDay()).not.toBe(d0);
    await page.keyboard.press('ArrowDown');

    for (const v of ['Semana', 'Agenda', 'Galeria']) {
      await page.getByRole('button', { name: v, exact: true }).click();
      await page.waitForTimeout(700);
      await noViolations(page, v);
    }
    await page.getByRole('button', { name: 'Mês', exact: true }).click();

    await page.getByRole('button', { name: 'Novo compromisso' }).first().click();
    const modal = page.getByRole('dialog').first();
    await expect(modal).toBeVisible();
    await noViolations(page, 'modal novo', '[role=dialog]');
    await page.keyboard.press('Escape');
    await expect(modal).toBeHidden();

    await page.getByRole('button', { name: /Compromisso 1/ }).first().click();
    const drawer = page.getByRole('dialog', { name: 'Detalhes do compromisso' });
    await expect(drawer).toBeVisible();
    await noViolations(page, 'gaveta', '[role=dialog]');
    await page.keyboard.press('Escape');
    await expect(drawer).toBeHidden();
  });

  test('axe: Hoje com o card, sino aberto e Notificações; teclado no sino', async ({ page, request }) => {
    test.setTimeout(180_000);
    const { headers, userId } = await accountUser(page, request);
    await request.post(`${API}/v1/calendar/tour-seen`, { headers });
    await seedEvents(request, headers);
    for (const [t, c] of [['review_reminder', 'review'], ['map_ready', 'maps']] as const)
      psql(`insert into notifications (user_id, type, category, href, data, idempotency_key) values ('${userId}', '${t}', '${c}', '/app/hoje', '{"cards": 4, "mapTitle": "Sepse", "mapId": "00000000-0000-0000-0000-000000000000"}', '${t}:${Math.random()}')`);
    await page.goto('/app/hoje');
    await expect(page.getByText('Próximos compromissos').first()).toBeVisible();
    await noViolations(page, 'hoje');

    const bell = page.getByRole('button', { name: /^Notificações/ });
    await bell.focus();
    await page.keyboard.press('Enter');
    const pop = page.getByRole('dialog', { name: 'Central de notificações' });
    await expect(pop).toBeVisible();
    await noViolations(page, 'popover do sino', '[role=dialog]');
    await page.keyboard.press('Escape');
    await expect(pop).toBeHidden();
    await expect(bell).toBeFocused(); // foco volta ao sino

    await expect(async () => {
      await page.goto('/app/notificacoes');
      await expect(page.getByRole('heading', { name: 'Notificações', level: 1 })).toBeVisible({ timeout: 5000 });
    }).toPass({ timeout: 30_000 });
    await noViolations(page, 'notificações');
  });

  test('movimento reduzido: tutorial montado, sem animações e sem transições', async ({ browser, request }) => {
    test.setTimeout(120_000);
    const ctx = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await accountUser(page, request);
    await page.goto('/app/calendario');
    const tour = page.getByRole('dialog', { name: 'Como o calendário funciona' });
    await expect(tour).toBeVisible();
    await page.waitForTimeout(800);
    const moving = await page.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running' && !(a.effect as KeyframeEffect | null)?.target?.closest?.('[data-nextjs-toast],nextjs-portal')).map((a) => `${(a as CSSAnimation).animationName ?? (a as CSSTransition).transitionProperty}`));
    expect(moving, 'animações rodando com prefers-reduced-motion').toEqual([]);
    await ctx.close();
  });
});

test.describe('celular (alvos de toque)', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

  test('alvos ≥ 44 px: sino, novo compromisso, seletor de visão, setas e compromissos', async ({ page, request }) => {
    test.setTimeout(120_000);
    const { headers } = await accountUser(page, request);
    await request.post(`${API}/v1/calendar/tour-seen`, { headers });
    await seedEvents(request, headers);
    await page.goto('/app/calendario');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    const small: string[] = [];
    for (const loc of [page.getByRole('button', { name: /^Notificações/ }), page.getByRole('button', { name: 'Novo compromisso' }).first(), page.getByRole('button', { name: 'Hoje', exact: true }), page.getByRole('button', { name: 'Semana', exact: true }), page.getByRole('button', { name: 'Mês', exact: true }), page.getByRole('button', { name: 'Anterior' }), page.getByRole('button', { name: 'Próximo' })]) {
      if (!(await loc.count())) continue; // a visão Agenda do celular não tem setas
      const b = await loc.first().boundingBox();
      if (!b) continue;
      if (b.width < 44 || b.height < 44) small.push(`${await loc.first().getAttribute('aria-label') ?? await loc.first().innerText()}: ${Math.round(b.width)}x${Math.round(b.height)}`);
    }
    expect(small).toEqual([]);
  });
});
