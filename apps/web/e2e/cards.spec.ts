import { expect, test, type Page } from '@playwright/test';

async function signUpAndCreateBoard(page: Page, title: string) {
  await page.goto('/cadastro');
  await page.getByLabel('E-mail').fill(`e2e-cards-${Date.now()}@remoa.test`);
  await page.getByLabel('Senha').fill('senha-forte-123');
  await page.getByRole('button', { name: 'Criar conta' }).click();
  await expect(page).toHaveURL(/\/mapas$/);
  await page.getByRole('button', { name: 'Criar mapa em branco' }).click();
  await page.getByLabel('Nome do mapa').fill(title);
  await page.getByRole('button', { name: 'Criar mapa', exact: true }).click();
  await expect(page).toHaveURL(/\/mapas\/[0-9a-f-]{36}$/);
  await expect(page.locator('.react-flow__pane')).toBeVisible();
}

const inspector = (page: Page) => page.getByRole('complementary', { name: 'Detalhes do card' });
const editorForm = (page: Page) => inspector(page).getByRole('form');

async function create(page: Page, tool: string, title: string) {
  await page.getByRole('button', { name: `Adicionar ${tool}` }).click();
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
    await create(page, 'Card', 'Sepse');
    await editorForm(page).getByLabel('Pergunta ou dica (opcional)').fill('Qual a definição de sepse?');
    await editorForm(page).getByLabel('Resposta', { exact: true }).fill('**Disfunção orgânica** com risco de vida');
    await editorForm(page).getByLabel('Fonte (texto ou URL)').fill('Sepsis-3 (2016)');
    await save(page);
    await expect(page.getByRole('article', { name: 'Conceito: Sepse' })).toContainText('Disfunção orgânica com risco de vida');
  });

  await test.step('fluxograma com 3 passos', async () => {
    await create(page, 'Fluxograma', 'Pacote');
    await editorForm(page).getByLabel('Passo 1', { exact: true }).fill('Dosar lactato');
    await editorForm(page).getByLabel('Passo 2', { exact: true }).fill('Colher hemoculturas');
    await editorForm(page).getByRole('button', { name: 'Adicionar passo' }).click();
    await editorForm(page).getByLabel('Passo 3', { exact: true }).fill('Antimicrobiano');
    await save(page);
    await expect(page.getByRole('article', { name: 'Fluxograma: Pacote' })).toContainText('3 passos');
  });

  await test.step('caso com 2 etapas', async () => {
    await create(page, 'Caso', 'Idoso febril');
    await editorForm(page).getByLabel('Apresentação').fill('Febre e confusão');
    await editorForm(page).getByLabel('Conduta').fill('Pacote da primeira hora');
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

  await page.getByRole('button', { name: 'Organizar' }).click();
  await expect(page.getByRole('status').filter({ hasText: /Salv/ })).toHaveText('Salvo agora', { timeout: 15_000 });
  const events = await page.evaluate(() => (window.__remoaEvents ?? []).map((e) => e.event));
  expect(events).toEqual(expect.arrayContaining(['card_edited', 'flow_step_added', 'image_uploaded', 'mask_created']));

  await test.step('recarrega: cada card mostra seu tipo', async () => {
    await page.reload();
    await expect(page.getByRole('article', { name: 'Conceito: Sepse' })).toContainText('Disfunção orgânica com risco de vida');
    await expect(page.getByRole('article', { name: 'Fluxograma: Pacote' })).toContainText('3 passos');
    const caso = page.getByRole('article', { name: 'Caso: Idoso febril' });
    await expect(caso.getByRole('listitem')).toHaveText(['Apresentação', 'Conduta']);
    const img = page.getByRole('article', { name: 'Imagem: Coração' });
    await expect(img).toContainText('3 máscaras');
    await expect(img.getByRole('img', { name: 'Imagem do card Coração' })).toHaveAttribute('src', /^https?:/);
  });

  await test.step('reabre a imagem: 3 máscaras no editor', async () => {
    await page.getByRole('button', { name: 'Abrir Coração' }).click();
    await editorForm(page).getByRole('button', { name: 'Abrir editor de máscaras' }).click();
    const dialog = page.getByRole('dialog', { name: 'Máscaras de Coração' });
    await expect(dialog.getByRole('button', { name: /^Máscara: Região \d$/ })).toHaveCount(3);
  });
});
