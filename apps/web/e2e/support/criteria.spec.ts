// G13 QA (T12): FAB ausente no desafio, payload técnico só com a lista fechada, movimento reduzido (suporte e admin).
import { expect, test } from '@playwright/test';
import { accountUser, API, psql } from '../account/fixture';

test.use({ viewport: { width: 1440, height: 900 }, colorScheme: 'light' });

const running = (page: import('@playwright/test').Page) =>
  page.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running').length);

test('desafio sem botão de suporte; o payload técnico só tem a lista fechada e nunca conteúdo do mapa', async ({ page, request }) => {
  test.setTimeout(120_000);
  const { headers } = await accountUser(page, request);
  const board = await request.post(`${API}/v1/boards`, { headers, data: { title: 'Mapa com conteudo secreto-xyz' } });
  const id = (await board.json()).data.id as string;
  await page.goto(`/app/mapas/${id}?modo=desafio`);
  await expect(page.getByRole('button', { name: 'Sair do desafio' }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: /Abrir suporte/ })).toHaveCount(0);

  await page.goto('/app/hoje');
  await page.getByRole('button', { name: /Abrir suporte/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Fale com o suporte' });
  await dialog.getByRole('button', { name: 'Algo não funciona' }).click();
  await dialog.getByLabel('Assunto').fill('Teste do payload técnico');
  await dialog.getByLabel('O que aconteceu?').fill('Verificando o que vai junto no envio do chamado de suporte.');
  const req = page.waitForRequest((r) => r.url().endsWith('/v1/support/tickets') && r.method() === 'POST');
  await dialog.getByRole('button', { name: 'Enviar chamado' }).click();
  const raw = (await req).postData() ?? '';
  const body = JSON.parse(raw) as { context: Record<string, string> | null };
  expect(Object.keys(body.context ?? {}).sort()).toEqual(['appVersion', 'browser', 'os', 'plan', 'screen', 'timezone']);
  expect(body.context!.screen).not.toMatch(/[?#]/);
  expect(raw).not.toMatch(/secreto-xyz|password|senha|token|access_token|authorization/i);
});

test('movimento reduzido: suporte e admin sem animação rodando, quadro final visível', async ({ page, request }) => {
  test.setTimeout(120_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const u = await accountUser(page, request);
  await page.goto('/app/hoje');
  await page.getByRole('button', { name: /Abrir suporte/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Fale com o suporte' });
  await expect(dialog).toBeVisible();
  expect(await running(page), 'suporte').toBe(0);
  await expect(dialog).toHaveCSS('opacity', '1');
  await page.keyboard.press('Escape');

  psql(`update profiles set role = 'admin' where user_id = '${u.userId}'`);
  await page.goto('/admin');
  await expect(page.getByRole('heading', { level: 1, name: 'Visão geral' })).toBeVisible();
  expect(await running(page), 'admin').toBe(0);
  const bars = await page.evaluate(() => [...document.querySelectorAll('.growy')].map((e) => getComputedStyle(e).transform));
  for (const t of bars) expect(t === 'none' || t === 'matrix(1, 0, 0, 1, 0, 0)', t).toBe(true);
});
