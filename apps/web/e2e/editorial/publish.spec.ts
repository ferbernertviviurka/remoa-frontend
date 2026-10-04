// F10 audit gap: the reviewer approves 3 cards and publishes a seed; a student sees it in "Mapa pronto" with provenance (rule 6).
import { expect, test } from '@playwright/test';
import { accountUser, psql } from '../account/fixture';

test('reviewer approves 3 cards, publishes, and the student sees the seed with the reviewer provenance', async ({ browser, request }) => {
  test.setTimeout(120_000);
  const title = `Seed e2e ${Date.now()}`;
  const author = await accountUser(await (await browser.newContext()).newPage(), request, 'Autor');
  const board = psql(`insert into boards (user_id, title, area, status) values ('${author.userId}', '${title}', 'CM', 'seed_draft') returning id`).split('\n')[0]!;
  for (const n of [1, 2, 3]) {
    const card = psql(`insert into cards (board_id, type, title, status) values ('${board}', 'concept', 'Card ${n}', 'draft') returning id`).split('\n')[0]!;
    psql(`insert into review_queue (card_id, status, flag_source) values ('${card}', 'pending', 'ai')`);
  }

  const rctx = await browser.newContext();
  const rpage = await rctx.newPage();
  const reviewer = await accountUser(rpage, request, 'Revisora Teste');
  psql(`update profiles set role = 'reviewer', crm = null where user_id = '${reviewer.userId}'`);
  await rpage.goto('/app/editorial');
  await rpage.getByLabel('Marco temporal').fill('Enamed 2026.2');

  // no CRM yet: the API refuses and the screen asks for it, with the link to the field
  await rpage.getByLabel('Mapa').selectOption(board);
  await rpage.getByRole('button', { name: 'Aprovar' }).first().click();
  await expect(rpage.locator('p[role=alert]')).toContainText('Informe seu CRM');
  await rpage.getByLabel('CRM', { exact: true }).fill('abc');
  await rpage.getByRole('button', { name: 'Salvar CRM' }).click();
  await expect(rpage.getByText('Formato do CRM')).toBeVisible();
  await rpage.getByLabel('CRM', { exact: true }).fill('CRM 654321 sp');
  await rpage.getByRole('button', { name: 'Salvar CRM' }).click();
  await expect(rpage.getByText('CRM salvo')).toBeVisible();

  // publishing is blocked while cards are draft
  const row = rpage.getByRole('listitem').filter({ hasText: title });
  await row.getByRole('button', { name: 'Publicar versão' }).click();
  await expect(rpage.locator('p[role=alert]')).toContainText('3 cards em rascunho');

  for (let left = 3; left > 0; left--) {
    await rpage.getByRole('button', { name: 'Aprovar' }).first().click();
    await expect(rpage.getByText(`${left - 1} de ${left - 1} na fila`).or(rpage.getByText('Nenhum card na fila.'))).toBeVisible();
  }
  await row.getByRole('button', { name: 'Publicar versão' }).click();
  await expect(row).toHaveCount(0);

  const sctx = await browser.newContext();
  const spage = await sctx.newPage();
  await accountUser(spage, request, 'Aluna');
  await spage.goto('/app/mapas/novo?caminho=pronto');
  const seed = spage.getByRole('listitem').filter({ hasText: title });
  await expect(seed).toBeVisible();
  await expect(seed).toContainText('Enamed 2026.2');
});
