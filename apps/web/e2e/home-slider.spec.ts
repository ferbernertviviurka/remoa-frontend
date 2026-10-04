// F14 T4: carrossel "Continue de onde parou" (Swiper) em Hoje.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import { signUpAndLogin } from './visual/fixture';

test.use({ viewport: { width: 1440, height: 900 } });

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const psql = (sql: string) => {
  const db = process.env.DATABASE_URL ?? /DATABASE_URL="?([^"\n]*)/.exec(readFileSync('../../../remoa-backend/.env', 'utf8'))?.[1] ?? '';
  execFileSync('psql', [db, '-q', '-c', sql]);
};
const makeBoards = async (request: APIRequestContext, headers: { authorization: string }, n: number) => {
  for (let i = 1; i <= n; i++) {
    const r = await request.post(`${API}/v1/boards`, { headers, data: { title: `Mapa ${i}`, area: 'CM' } });
    expect(r.ok(), `board ${i}`).toBeTruthy();
  }
};
const setPro = (userId: string) => psql(`insert into subscriptions (user_id, plan, status) values ('${userId}','pro','active') on conflict (user_id) do update set plan='pro'`);
const events = (page: Page) => page.evaluate(() => (window as unknown as { __remoaEvents?: { event: string; props: object }[] }).__remoaEvents ?? []);

test('Free com 2 mapas: o cadeado é o 3º cartão e leva ao upgrade', async ({ page, request }) => {
  test.setTimeout(120_000);
  const { headers } = await signUpAndLogin(page, request);
  await makeBoards(request, headers, 2);
  await page.goto('/app/hoje');
  const region = page.getByRole('region', { name: 'Continue de onde parou' });
  await expect(region.getByText('Limite do plano Free')).toBeVisible();
  await expect(region.getByRole('link', { name: 'Criar um novo mapa' })).toHaveCount(0);
  await expect(region.getByRole('link', { name: /Abrir o mapa Mapa/ })).toHaveCount(2);
  await expect(region.getByRole('button', { name: 'Mapas anteriores' })).toBeDisabled();
  await expect(region.getByRole('button', { name: 'Próximos mapas' })).toBeDisabled(); // 3 cartões, sem excesso
  // FR-20: no limite o "Novo mapa" do cabeçalho leva ao upgrade
  await region.locator('xpath=ancestor::main').getByRole('button', { name: 'Novo mapa' }).first().click();
  await expect(page).toHaveURL(/\/planos\?de=header_new_map_lock/);
  expect((await events(page)).some((e) => e.event === 'upgrade_clicked' && JSON.stringify(e.props).includes('header_new_map_lock'))).toBe(true);
});

test('Free com 1 mapa: novo e depois o cadeado', async ({ page, request }) => {
  test.setTimeout(120_000);
  const { headers } = await signUpAndLogin(page, request);
  await makeBoards(request, headers, 1);
  await page.goto('/app/hoje');
  const region = page.getByRole('region', { name: 'Continue de onde parou' });
  const links = region.locator('.swiper-slide a, .swiper-slide button');
  await expect(region.getByText('Você ainda pode criar 1 mapa no plano Free.')).toBeVisible();
  await expect(links.nth(0)).toHaveAccessibleName('Abrir o mapa Mapa 1');
  await expect(links.nth(1)).toHaveAccessibleName('Criar um novo mapa');
  await expect(links.nth(2)).toHaveAccessibleName(/Fazer upgrade/);
  await region.getByRole('button', { name: /Fazer upgrade/ }).click();
  await expect(page).toHaveURL(/\/planos\?de=map_slider_lock/);
  expect((await events(page)).map((e) => e.event)).toContain('upgrade_clicked');
});

test('Pro com 6 mapas: setas, teclado, contador, CLS 0 e axe', async ({ page, request }) => {
  test.setTimeout(180_000);
  const { userId, headers } = await signUpAndLogin(page, request);
  setPro(userId);
  await makeBoards(request, headers, 6);
  await page.addInitScript(() => {
    (window as unknown as { __cls: number }).__cls = 0;
    new PerformanceObserver((l) => { for (const e of l.getEntries() as unknown as { hadRecentInput: boolean; value: number }[]) if (!e.hadRecentInput) (window as unknown as { __cls: number }).__cls += e.value; }).observe({ type: 'layout-shift', buffered: true });
  });
  await page.goto('/app/hoje');
  const region = page.getByRole('region', { name: 'Continue de onde parou' });
  await expect(region.getByText('1–3 de 6')).toBeVisible();
  const prev = region.getByRole('button', { name: 'Mapas anteriores' });
  const next = region.getByRole('button', { name: 'Próximos mapas' });
  await expect(prev).toBeDisabled();
  await expect(next).toBeEnabled();
  await page.waitForTimeout(800);
  // FR-16: CLS da página (Lighthouse arredonda a 0,00); 1e-3 tolera sub-pixel do chip "vencem hoje" entre o CSS base e o Swiper
  expect(await page.evaluate(() => (window as unknown as { __cls: number }).__cls), 'CLS').toBeLessThan(0.001);

  await next.click();
  await expect(region.getByText('2–4 de 6')).toBeVisible();
  await expect(prev).toBeEnabled();
  await region.locator('.swiper').focus();
  await page.keyboard.press('ArrowRight');
  await expect(region.getByText('3–5 de 6')).toBeVisible();
  await page.keyboard.press('ArrowRight');
  await expect(region.getByText('4–6 de 6')).toBeVisible();
  await expect(next).toBeDisabled();
  await prev.click();
  await expect(region.getByText('3–5 de 6')).toBeVisible();
  const ev = await events(page);
  expect(ev.filter((e) => e.event === 'map_slider_navigated').length).toBeGreaterThanOrEqual(4);

  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).exclude('nextjs-portal').analyze();
  expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`)).toEqual([]);
  if (process.env.SLIDER_SHOT) await page.screenshot({ path: process.env.SLIDER_SHOT });
});

test('cartão do limite: o CTA fica dentro do cartão em 1024, 1100, 1280, 1366 e 1440', async ({ page, request }) => {
  test.setTimeout(120_000);
  const { headers } = await signUpAndLogin(page, request);
  await makeBoards(request, headers, 2);
  for (const width of [1024, 1100, 1280, 1366, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/app/hoje');
    const region = page.getByRole('region', { name: 'Continue de onde parou' });
    const card = region.getByText('Limite do plano Free').locator('xpath=ancestor::div[contains(@class,"border-dashed")][1]');
    await expect(card).toBeVisible();
    const [c, b] = [await card.boundingBox(), await region.getByRole('button', { name: /Fazer upgrade/ }).boundingBox()];
    expect(c!.height, `altura em ${width}`).toBe(312);
    expect(b!.y + b!.height, `CTA abaixo do cartão em ${width}`).toBeLessThanOrEqual(c!.y + c!.height);
    expect(b!.x + b!.width, `CTA à direita do cartão em ${width}`).toBeLessThanOrEqual(c!.x + c!.width);
  }
});
