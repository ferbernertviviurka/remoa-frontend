import { createBlankBoard } from './create-map';
import { signUpViaForm } from './sign-up';
import { expect, test, type Page } from '@playwright/test';

async function signUpAndCreateBoard(page: Page, title: string) {
  await signUpViaForm(page, `e2e-map-${Date.now()}@remoa.test`);
  await expect(page).toHaveURL(/\/app\/hoje$/); // D-321: pós-login cai no Hoje
  await page.goto('/app/mapas');
  await createBlankBoard(page, title);
  await expect(page.locator('.react-flow__pane')).toBeVisible();
}

const nodes = (page: Page) => page.locator('.react-flow__node');
const panel = (page: Page) => page.getByRole('complementary', { name: 'Painel do mapa' });
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
    // the first card re-centres the view (fitView): the next ones go above it, clear of the layer bar and the panel (T5)
    for (const [x, y] of [[0.35, 0.45], [0.1, 0.2], [0.6, 0.2]] as const)
      await page.mouse.dblclick(pane.x + pane.width * x, pane.y + pane.height * y);
    await expect(nodes(page)).toHaveCount(3);
    await expect(page.getByRole('button', { name: 'Selecionar Novo conceito' })).toHaveCount(3);
    // the new card is selected and shown in the panel
    await expect(panel(page).getByRole('heading', { name: 'Novo conceito' })).toBeVisible();

    // G02: port → port, and port → the other card's body (both connect)
    await drag(page, await center(page, '.react-flow__node .react-flow__handle.source', 0), await center(page, '.react-flow__node .react-flow__handle.target', 1));
    await expect(page.locator('.react-flow__edge')).toHaveCount(1);
    await drag(page, await center(page, '.react-flow__node .react-flow__handle.source', 0), await center(page, '.react-flow__node', 2));
    await expect(page.locator('.react-flow__edge')).toHaveCount(2);
    // T5: an unlabelled edge shows "+ rótulo" only while selected; the pill opens the label dialog
    await expect(page.getByRole('button', { name: 'Adicionar rótulo' })).toHaveCount(0);
    await page.locator('.react-flow__edge').first().focus();
    await page.keyboard.press('Enter');
    await page.getByRole('button', { name: 'Adicionar rótulo' }).click();
    await page.getByRole('dialog', { name: 'Rótulo da conexão' }).getByLabel('Rótulo da conexão').fill('causa');
    await page.keyboard.press('Enter');
    await expect(page.getByRole('button', { name: 'Editar rótulo: causa' })).toBeVisible();
    await expect(saveStatus(page)).toHaveText('Salvo agora', { timeout: 10_000 });

    const events = await page.evaluate(() => (window.__remoaEvents ?? []).map((e) => e.event));
    expect(events).toEqual(expect.arrayContaining(['board_opened', 'card_created', 'edge_created']));
  });

  await test.step('recarrega e confere', async () => {
    await page.reload();
    await expect(nodes(page)).toHaveCount(3);
    await expect(page.locator('.react-flow__edge')).toHaveCount(2);
    await expect(panel(page)).toHaveCount(0); // D-098: no selection, no panel
    // labels only render at zoom >= 70% and fitView lands at ~60% on this viewport: zoom in before looking for the pill
    await page.getByRole('button', { name: 'Aumentar zoom' }).click();
    await expect(page.getByRole('button', { name: 'Editar rótulo: causa' })).toBeVisible();
  });

  await test.step('offline: move 3 cards; online: salva; recarrega: posições persistem', async () => {
    const before = await transforms(page);
    await context.setOffline(true);
    for (let i = 0; i < 3; i++) {
      const h = await center(page, '.react-flow__node', i);
      await drag(page, h, { x: h.x + 40, y: h.y + 64 });
    }
    await expect(saveStatus(page)).toHaveText('Sem conexão, salvando depois', { timeout: 10_000 });
    const moved = await transforms(page);
    expect(moved).not.toEqual(before);
    await context.setOffline(false);
    await expect(saveStatus(page)).toHaveText('Salvo agora', { timeout: 15_000 });
    await page.evaluate(() => { localStorage.clear(); localStorage.setItem('remoa-challenge-tour', '1'); }); // positions must come from the API, not the local queue (tour stays seen, D-606)
    await page.reload();
    await expect(nodes(page)).toHaveCount(3);
    expect(await transforms(page)).toEqual(moved);
  });

  await test.step('"Ligar dois cards": origem → destino; persiste', async () => {
    await page.getByRole('button', { name: 'Ligar dois cards' }).click();
    await expect(page.getByText('Clique no card de origem.')).toBeVisible();
    await nodes(page).nth(1).getByRole('button', { name: 'Selecionar Novo conceito' }).click();
    await expect(page.getByText('Agora clique no card de destino.')).toBeVisible();
    await nodes(page).nth(2).getByRole('button', { name: 'Selecionar Novo conceito' }).click();
    await expect(page.locator('.react-flow__edge')).toHaveCount(3);
    await page.keyboard.press('Escape'); // drops the tool
    await expect(saveStatus(page)).toHaveText('Salvo agora', { timeout: 10_000 });
    await page.reload();
    await expect(page.locator('.react-flow__edge')).toHaveCount(3);
  });

  await test.step('camadas: Lembrança sem revisões; Estrutura conta conexões', async () => {
    await expect(nodes(page).getByText('Sem revisões ainda')).toHaveCount(3);
    await page.getByRole('button', { name: 'Estrutura' }).click();
    await expect(nodes(page).getByText('2 conexões')).toHaveCount(3);
    await nodes(page).first().getByRole('button', { name: 'Selecionar Novo conceito' }).click();
    await expect(panel(page).getByText('Sem revisões ainda')).toBeVisible();
  });
});
