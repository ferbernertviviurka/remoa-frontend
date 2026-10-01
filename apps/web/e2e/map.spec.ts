import { expect, test, type Page } from '@playwright/test';

async function signUpAndCreateBoard(page: Page, title: string) {
  await page.goto('/cadastro');
  await page.getByLabel('E-mail').fill(`e2e-map-${Date.now()}@remoa.test`);
  await page.getByLabel('Senha').fill('senha-forte-123');
  await page.getByRole('button', { name: 'Criar conta' }).click();
  await expect(page).toHaveURL(/\/mapas$/);
  await page.getByRole('button', { name: 'Criar mapa em branco' }).click();
  await page.getByLabel('Nome do mapa').fill(title);
  await page.getByRole('button', { name: 'Criar mapa', exact: true }).click();
  await expect(page).toHaveURL(/\/mapas\/[0-9a-f-]{36}$/);
  await expect(page.locator('.react-flow__pane')).toBeVisible();
}

const nodes = (page: Page) => page.locator('.react-flow__node');
const saveStatus = (page: Page) => page.getByRole('status').filter({ hasText: /Salv|Sem conexão/ });
const transforms = (page: Page) => nodes(page).evaluateAll((els) => els.map((e) => [e.dataset.id, (e as HTMLElement).style.transform]).sort());

async function drag(page: Page, from: { x: number; y: number }, to: { x: number; y: number }) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 8 });
  await page.mouse.up();
}
const center = async (page: Page, selector: string, i: number) => {
  const b = (await page.locator(selector).nth(i).boundingBox())!;
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
};

test('mapa: 3 cards, 2 conexões, salva sozinho e persiste; offline → online mantém posições', async ({ page, context }) => {
  await signUpAndCreateBoard(page, 'Sepse');
  const pane = (await page.locator('.react-flow__pane').boundingBox())!;

  await test.step('cria 3 cards e 2 conexões', async () => {
    for (const [x, y] of [[180, 140], [520, 140], [350, 380]] as const)
      await page.mouse.dblclick(pane.x + x, pane.y + y);
    await expect(nodes(page)).toHaveCount(3);
    await expect(page.getByRole('article', { name: 'Conceito: Novo conceito' })).toHaveCount(3);
    // the new card is selected and shown in the inspector
    await expect(page.getByRole('complementary', { name: 'Detalhes do card' }).getByRole('heading', { name: 'Novo conceito' })).toBeVisible();

    for (const [a, b] of [[0, 1], [0, 2]] as const)
      await drag(page, await center(page, '.react-flow__node .react-flow__handle.source', a), await center(page, '.react-flow__node .react-flow__handle.target', b));
    await expect(page.locator('.react-flow__edge')).toHaveCount(2);
    await expect(page.getByRole('button', { name: 'Adicionar rótulo' })).toHaveCount(2);
    await expect(saveStatus(page)).toHaveText('Salvo agora', { timeout: 10_000 });

    const events = await page.evaluate(() => (window.__remoaEvents ?? []).map((e) => e.event));
    expect(events).toEqual(expect.arrayContaining(['board_opened', 'card_created', 'edge_created']));
  });

  await test.step('recarrega e confere', async () => {
    await page.reload();
    await expect(nodes(page)).toHaveCount(3);
    await expect(page.locator('.react-flow__edge')).toHaveCount(2);
    await expect(page.getByText('3 conceitos · 2 conexões')).toBeVisible();
  });

  await test.step('offline: move 3 cards; online: salva; recarrega: posições persistem', async () => {
    const before = await transforms(page);
    await context.setOffline(true);
    for (let i = 0; i < 3; i++) {
      const h = await center(page, '.react-flow__node .torph-map-card-drag', i);
      await drag(page, h, { x: h.x + 40, y: h.y + 64 });
    }
    await expect(saveStatus(page)).toHaveText('Sem conexão, salvando depois', { timeout: 10_000 });
    const moved = await transforms(page);
    expect(moved).not.toEqual(before);
    await context.setOffline(false);
    await expect(saveStatus(page)).toHaveText('Salvo agora', { timeout: 15_000 });
    await page.evaluate(() => localStorage.clear()); // positions must come from the API, not the local queue
    await page.reload();
    await expect(nodes(page)).toHaveCount(3);
    expect(await transforms(page)).toEqual(moved);
  });

  await test.step('Lembrança estimada: sem dados do F03, todo card fica "Sem revisões"', async () => {
    await page.getByLabel('Lembrança estimada').click();
    await expect(nodes(page).getByText('Sem revisões')).toHaveCount(3);
    await nodes(page).first().getByRole('button', { name: 'Abrir Novo conceito' }).click();
    await expect(page.getByRole('complementary', { name: 'Detalhes do card' }).getByText('Ainda sem revisões')).toBeVisible();
  });
});
