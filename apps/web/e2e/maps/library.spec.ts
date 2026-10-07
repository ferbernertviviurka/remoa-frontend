// F31 (G23 T4/T5): library lists approved maps only, badge, Ver, Usar, Reportar erro reaches the reviewer queue.
import { expect, test } from '@playwright/test';
import { accountUser, psql } from '../account/fixture';

test('student sees approved ready maps (never drafts) with the Top 10 badge, reads one, copies it and reports an error', async ({ browser, request }) => {
  test.setTimeout(120_000);
  const stamp = Date.now();
  const author = await accountUser(await (await browser.newContext()).newPage(), request, 'Autor');
  const mk = (title: string, status: string, badge: boolean) => psql(`insert into boards (user_id, title, area, status, badges) values ('${author.userId}', '${title}', 'CM', '${status}', ${badge ? "array['top10_enamed']" : "'{}'"}) returning id`).split('\n')[0]!;
  const ok = mk(`Biblioteca ok ${stamp}`, 'seed_approved', true);
  mk(`Biblioteca rascunho ${stamp}`, 'seed_draft', false);
  const card = psql(`insert into cards (board_id, type, title, back, status) values ('${ok}', 'concept', 'Card único', 'Verso', 'approved') returning id`).split('\n')[0]!;

  const page = await (await browser.newContext()).newPage();
  await accountUser(page, request, 'Aluna');
  await page.goto('/app/mapas?aba=biblioteca');
  const item = page.getByRole('listitem').filter({ hasText: `Biblioteca ok ${stamp}` });
  await expect(item).toContainText('Top 10 ENAMED');
  await expect(page.getByText(`Biblioteca rascunho ${stamp}`)).toHaveCount(0);
  await expect(page.getByText(/Conteúdo educacional/).first()).toBeVisible();

  await item.getByRole('link', { name: /Ver/ }).click();
  await page.getByRole('button', { name: 'Reportar erro' }).click();
  await page.getByLabel('O que está errado?').fill('Dose errada');
  await page.getByRole('button', { name: 'Enviar' }).click();
  await expect(page.getByText('Recebido.')).toBeVisible();
  expect(psql(`select count(*) from review_queue where card_id = '${card}' and flag_source = 'user_disagree' and status = 'pending'`).trim()).toBe('1');

  await page.getByRole('button', { name: 'Usar este mapa' }).click();
  await expect(page).toHaveURL(/\/app\/mapas\/[0-9a-f-]{36}$/);
});
