import { createBlankBoard } from './create-map';
import { signUpViaForm } from './sign-up';
import { expect, test, type Page } from '@playwright/test';

async function signUpAndCreateBoard(page: Page, title: string) {
  await signUpViaForm(page, `e2e-cards-${Date.now()}@remoa.test`);
  await expect(page).toHaveURL(/\/app\/hoje$/); // D-321: pós-login cai no Hoje
  await page.goto('/app/mapas');
  await createBlankBoard(page, title);
  await expect(page.locator('.react-flow__pane')).toBeVisible();
}

const inspector = (page: Page) => page.getByRole('complementary', { name: 'Painel do mapa' });
const node = (page: Page, title: string) => page.locator('.react-flow__node').filter({ has: page.getByRole('button', { name: `Selecionar ${title}` }) });
const tool = { Conceito: 'Adicionar Pergunta e Resposta', Fluxograma: 'Adicionar fluxograma', Imagem: 'Adicionar imagem', Caso: 'Adicionar caso clínico' } as const;
const editorForm = (page: Page) => inspector(page).getByRole('form');

/** T5: one toolbar button per card type. */
async function create(page: Page, type: keyof typeof tool, title: string) {
  await page.getByRole('toolbar', { name: 'Ferramentas do mapa' }).getByRole('button', { name: tool[type] }).click();
  await expect(editorForm(page)).toBeVisible(); // the new card opens in the editor
  await editorForm(page).getByLabel('Título').fill(title);
}
async function save(page: Page) {
  await editorForm(page).getByRole('button', { name: 'Salvar' }).click();
  await expect(editorForm(page)).toHaveCount(0); // closes on success
}

/** A real PNG made by the browser (the API converts it to WebP). */
async function pngFixture(page: Page): Promise<Buffer> {
  const b64 = await page.evaluate(() => {
    const c = document.createElement('canvas');
    c.width = 400;
    c.height = 300;
    const g = c.getContext('2d')!;
    g.fillStyle = '#e0f2fe';
    g.fillRect(0, 0, 400, 300);
    g.fillStyle = '#c2410c';
    g.fillRect(40, 40, 120, 80);
    return c.toDataURL('image/png').split(',')[1]!;
  });
  return Buffer.from(b64, 'base64');
}

test('cards: um de cada tipo, salva, recarrega e o mapa mostra cada tipo', async ({ page }) => {
  test.setTimeout(120_000);
  await signUpAndCreateBoard(page, 'Sepse');

  await test.step('conceito', async () => {
    await create(page, 'Conceito', 'Sepse');
    await editorForm(page).getByLabel('Pergunta ou dica (opcional)').fill('Qual a definição de sepse?');
    await editorForm(page).getByLabel('Resposta', { exact: true }).fill('**Disfunção orgânica** com risco de vida');
    await editorForm(page).getByLabel('Fonte (texto ou URL)').fill('Sepsis-3 (2016)');
    // G02 / D-096: question image (same upload flow as the image card)
    await editorForm(page).getByRole('group', { name: 'Imagem da pergunta (opcional)' }).locator('input[type="file"]').setInputFiles({ name: 'q.png', mimeType: 'image/png', buffer: await pngFixture(page) });
    await expect(editorForm(page).getByRole('img', { name: 'Imagem da pergunta de Sepse' })).toBeVisible({ timeout: 30_000 });
    await save(page);
    // D-097: the front shows the question (and its image); the answer only on the back
    await expect(node(page, 'Sepse')).toContainText('Qual a definição de sepse?');
    await expect(node(page, 'Sepse')).not.toContainText('Disfunção orgânica com risco de vida');
    await expect(node(page, 'Sepse').getByRole('img', { name: 'Imagem da pergunta de Sepse' })).toBeVisible();
    await node(page, 'Sepse').getByRole('button', { name: 'Ver resposta' }).click();
    await expect(node(page, 'Sepse')).toContainText('Disfunção orgânica com risco de vida');
    await node(page, 'Sepse').getByRole('button', { name: 'Ver pergunta' }).click();
  });

  await test.step('conceito em losango (D-095)', async () => {
    await create(page, 'Conceito', 'Choque');
    await editorForm(page).getByRole('group', { name: 'Formato no mapa' }).getByRole('button', { name: 'Losango' }).click();
    await save(page);
    await expect(node(page, 'Choque').locator('article')).toHaveAttribute('data-shape', 'diamond');
  });

  await test.step('fluxograma com 3 passos', async () => {
    await create(page, 'Fluxograma', 'Pacote');
    await editorForm(page).getByLabel('Passo 1', { exact: true }).fill('Dosar lactato');
    await editorForm(page).getByLabel('Passo 2', { exact: true }).fill('Colher hemoculturas');
    await editorForm(page).getByRole('button', { name: 'Adicionar passo' }).click();
    await editorForm(page).getByLabel('Passo 3', { exact: true }).fill('Antimicrobiano');
    await save(page);
    await page.keyboard.press('Escape'); // D-098: Esc closes the card panel (the new card may sit under it)
    await node(page, 'Pacote').getByRole('button', { name: 'Ver resposta' }).click(); // steps are the answer: back face
    await expect(node(page, 'Pacote').getByRole('listitem')).toHaveText(['1Dosar lactato', '2Colher hemoculturas', '3Antimicrobiano']);
  });

  await test.step('caso com 2 etapas', async () => {
    await create(page, 'Caso', 'Idoso febril');
    await editorForm(page).getByLabel('Apresentação', { exact: true }).fill('Febre e confusão');
    await editorForm(page).getByLabel('Conduta', { exact: true }).fill('Pacote da primeira hora');
    await save(page);
  });

  await test.step('imagem: upload e 3 máscaras', async () => {
    await create(page, 'Imagem', 'Coração');
    await editorForm(page).locator('input[type="file"]').setInputFiles({ name: 'atlas.png', mimeType: 'image/png', buffer: await pngFixture(page) });
    await expect(editorForm(page).getByRole('img', { name: 'Imagem do card Coração' })).toBeVisible({ timeout: 30_000 });
    await editorForm(page).getByRole('button', { name: 'Abrir editor de máscaras' }).click();
    const dialog = page.getByRole('dialog', { name: 'Máscaras de Coração' });
    const surface = dialog.getByRole('group', { name: 'Área de desenho das máscaras' });
    await expect(dialog.getByRole('img', { name: 'Imagem do card Coração' })).toBeVisible();
    const box = (await surface.boundingBox())!;
    for (const [x0, y0, x1, y1] of [[0.1, 0.1, 0.3, 0.3], [0.4, 0.1, 0.6, 0.3], [0.1, 0.5, 0.4, 0.8]] as const) {
      await page.mouse.move(box.x + x0 * box.width, box.y + y0 * box.height);
      await page.mouse.down();
      await page.mouse.move(box.x + x1 * box.width, box.y + y1 * box.height, { steps: 5 });
      await page.mouse.up();
    }
    await expect(dialog.getByText('3 de 30 máscaras')).toBeVisible();
    await dialog.getByRole('button', { name: 'Salvar' }).click();
    await expect(dialog).toHaveCount(0);
    await expect(editorForm(page)).toHaveCount(0);
  });

  await page.getByRole('button', { name: 'Organizar o mapa' }).click();
  await expect(page.getByRole('status').filter({ hasText: /Salv/ })).toHaveText('Salvo agora', { timeout: 15_000 });
  const events = await page.evaluate(() => (window.__remoaEvents ?? []).map((e) => e.event));
  expect(events).toEqual(expect.arrayContaining(['card_edited', 'flow_step_added', 'image_uploaded', 'mask_created']));

  await test.step('recarrega: cada card mostra seu tipo', async () => {
    await page.reload();
    await expect(node(page, 'Sepse')).toContainText('Qual a definição de sepse?');
    await expect(node(page, 'Sepse').getByRole('img', { name: 'Imagem da pergunta de Sepse' })).toHaveAttribute('src', /^https?:/);
    await expect(node(page, 'Choque').locator('article')).toHaveAttribute('data-shape', 'diamond');
    await expect(node(page, 'Pacote').getByRole('listitem')).toHaveCount(0); // flipping is local: reload shows the front
    await node(page, 'Pacote').getByRole('button', { name: 'Ver resposta' }).click();
    await expect(node(page, 'Pacote').getByRole('listitem')).toHaveCount(3);
    const caso = node(page, 'Idoso febril');
    await expect(caso.locator('button[data-filled="true"]')).toHaveText(['Apresentação', 'Conduta']); // G06: the 4-stage trail, filled ones marked
    const img = node(page, 'Coração');
    await expect(img.getByRole('img', { name: 'Imagem do card Coração' })).toHaveAttribute('src', /^https?:/);
  });

  await test.step('reabre a imagem: 3 máscaras no editor', async () => {
    // ⌘K › card: centres and selects it (it may be off-screen or under the panel after "Organizar")
    await page.keyboard.press('ControlOrMeta+k');
    await page.getByRole('combobox', { name: 'Buscar comando' }).fill('Coração');
    await page.keyboard.press('Enter');
    await expect(inspector(page).getByRole('heading', { name: 'Coração' })).toBeVisible();
    await inspector(page).getByRole('button', { name: 'Mais ações de Coração' }).click();
    await page.getByRole('menuitem', { name: 'Editar card' }).click();
    await editorForm(page).getByRole('button', { name: 'Abrir editor de máscaras' }).click();
    const dialog = page.getByRole('dialog', { name: 'Máscaras de Coração' });
    await expect(dialog.getByRole('button', { name: /^Máscara: Região \d$/ })).toHaveCount(3);
  });
});
