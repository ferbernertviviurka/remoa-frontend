// G15 / F21: /app/revisar com a API real. Estados, chips e mapas sem nova consulta, CTA com filtro, gráficos e axe.
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { createSepseBoard, seedMock, signUpAndLogin } from '../visual/fixture';

test.use({ viewport: { width: 1440, height: 900 }, colorScheme: 'light' });

const axe = async (page: Page) => {
  // the section reveal is scroll-driven (animation-timeline: view()): below the fold a section is mid-fade wherever the page stops.
  // Contrast is checked on the final state, which is what reduced motion renders (same pattern as g01-criterios).
  await page.emulateMedia({ reducedMotion: 'reduce' });
  // sections reveal on scroll: walk the page so nothing is mid-animation (opacity) when axe measures contrast
  await page.evaluate(async () => {
    for (let y = 0; y <= document.body.scrollHeight; y += 500) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 60));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(1800);
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).exclude('nextjs-portal').analyze();
  return r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`);
};
// The API caches the hub 60 s per user; any authenticated write through the API drops it (D-643), but the SQL seed below bypasses the
// API: reload until the cache expires (or a write drops it) and the seeded cards show up.
const openWhen = (page: Page, ready: () => Promise<void>) =>
  expect(async () => {
    await page.goto('/app/revisar');
    await ready();
  }).toPass({ timeout: 90_000, intervals: [5_000] });
const cta = (page: Page) => page.getByRole('button', { name: /^Começar revisão · \d+$/ });
const num = async (page: Page) => Number(/(\d+)$/.exec((await cta(page).textContent()) ?? '')?.[1]);

test('revisar: sem mapas', async ({ page, request }) => {
  test.setTimeout(180_000);
  await signUpAndLogin(page, request);
  await page.goto('/app/revisar');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Vamos começar?');
  await expect(page.getByRole('heading', { level: 2, name: 'Você ainda não tem cards para revisar.' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Criar meu primeiro mapa' })).toBeVisible();
  expect(await axe(page), 'vazio').toEqual([]);
});

// the hub is cached 60 s per user on the API: a fresh user per state
test('revisar: só cards novos (sem histórico)', async ({ page, request }) => {
  test.setTimeout(180_000);
  const { headers } = await signUpAndLogin(page, request);
  await createSepseBoard(request, headers);
  await openWhen(page, () => expect(cta(page)).toBeVisible({ timeout: 3000 }));
  await expect(page.getByRole('heading', { level: 2, name: 'Seus gráficos aparecem depois da primeira revisão.' })).toBeVisible();
  expect(await axe(page), 'sem histórico').toEqual([]);
});

test('revisar: chips e mapas recalculam sem consulta; CTA inicia a sessão filtrada; gráficos e a11y', async ({ page, request }) => {
  test.setTimeout(240_000);
  const { userId, headers } = await signUpAndLogin(page, request);
  await seedMock(request, headers, userId);
  await openWhen(page, () => expect(page.getByRole('heading', { level: 1 })).toContainText(/cards? esperam? por você\./, { timeout: 3000 }));
  const total = await num(page);
  expect(total).toBeGreaterThan(0);
  await expect(page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: /^Revisar/ })).toHaveAccessibleName(new RegExp(`${total} cards? na fila de hoje`));

  // no new request while toggling
  const calls: string[] = [];
  page.on('request', (r) => { if (/\/v1\/(review|challenge)/.test(r.url())) calls.push(r.url()); });
  const chips = page.getByRole('group', { name: 'O que entra na fila' });
  await chips.getByRole('button', { name: /Em atenção/ }).click();
  await expect(chips.getByRole('button', { name: /Em atenção/ })).toHaveAttribute('aria-pressed', 'true');
  const withWeak = await num(page);
  expect(withWeak).toBeGreaterThanOrEqual(total);
  await chips.getByRole('button', { name: /Em atenção/ }).click();
  await expect.poll(() => num(page)).toBe(total);
  const maps = page.getByRole('group', { name: 'Mapas na sessão' });
  await maps.getByRole('switch').first().click();
  await expect(maps.getByRole('switch').first()).toHaveAttribute('aria-checked', 'false');
  await expect.poll(() => num(page)).toBeLessThan(total);
  await maps.getByRole('switch').first().click();
  await expect.poll(() => num(page)).toBe(total);
  expect(calls).toEqual([]);

  // charts: retention period switch, table alternative, keyboard on the forecast
  await expect(page.getByRole('heading', { name: 'Próximos 14 dias' })).toBeVisible();
  await page.getByRole('radio', { name: '7 dias' }).click();
  await expect(page.getByRole('radio', { name: '7 dias' })).toBeChecked();
  const forecast = page.getByRole('figure', { name: /Revisões previstas/ });
  await forecast.getByRole('button', { name: 'Ver como tabela' }).first().click();
  await expect(forecast.getByRole('table')).toBeVisible();
  await forecast.getByRole('button', { name: /^\d+ cards?, / }).first().focus();
  await expect(forecast.locator('[role="presentation"]')).toBeVisible();

  expect(await axe(page), 'ativo').toEqual([]);

  // CTA: the session starts already filtered and opens the map
  const start = page.waitForRequest((r) => r.url().includes('/v1/challenge/start') && r.method() === 'POST');
  await cta(page).click();
  const body = (await start).postDataJSON();
  expect(body).toMatchObject({ kind: 'daily', limit: total, filter: { reasons: ['due', 'new'] } });
  await expect(page).toHaveURL(/\/app\/mapas\/[^?]+\?modo=desafio&sessao=diaria$/);
});
