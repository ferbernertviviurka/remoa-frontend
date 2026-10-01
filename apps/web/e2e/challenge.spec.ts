import { expect, test, type Page } from '@playwright/test';

const inspector = (page: Page) => page.getByRole('complementary', { name: 'Detalhes do card' });
const form = (page: Page) => inspector(page).getByRole('form');

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

test('desafiar este mapa: autoavaliação, opções, texto (sem rubrica) e resumo', async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto('/cadastro');
  await page.getByLabel('E-mail').fill(`e2e-challenge-${Date.now()}@remoa.test`);
  await page.getByLabel('Senha').fill('senha-forte-123');
  await page.getByRole('button', { name: 'Criar conta' }).click();
  await expect(page).toHaveURL(/\/mapas$/);
  await page.getByRole('button', { name: 'Criar mapa em branco' }).click();
  await page.getByLabel('Nome do mapa').fill('Sepse');
  await page.getByRole('button', { name: 'Criar mapa', exact: true }).click();
  await expect(page).toHaveURL(/\/mapas\/[0-9a-f-]{36}$/);
  await expect(page.locator('.react-flow__pane')).toBeVisible();

  await test.step('conceitos, fluxograma de 3 passos e uma conexão com rótulo', async () => {
    for (const [title, back] of [['Sepse', 'Disfunção orgânica por resposta desregulada à infecção'], ['Choque séptico', 'Sepse com hipotensão e lactato alto']]) {
      await page.getByRole('button', { name: 'Adicionar Card' }).click();
      await expect(form(page)).toBeVisible();
      await form(page).getByLabel('Título').fill(title!);
      await form(page).getByLabel('Resposta', { exact: true }).fill(back!);
      await form(page).getByRole('button', { name: 'Salvar' }).click();
      await expect(form(page)).toHaveCount(0);
    }
    await page.getByRole('button', { name: 'Adicionar Fluxograma' }).click();
    await form(page).getByLabel('Título').fill('Pacote da primeira hora');
    await form(page).getByLabel('Passo 1', { exact: true }).fill('Dosar lactato');
    await form(page).getByLabel('Passo 2', { exact: true }).fill('Colher hemoculturas');
    await form(page).getByRole('button', { name: 'Adicionar passo' }).click();
    await form(page).getByLabel('Passo 3', { exact: true }).fill('Antimicrobiano');
    await form(page).getByRole('button', { name: 'Salvar' }).click();
    await expect(form(page)).toHaveCount(0);

    await drag(page, await center(page, '.react-flow__node .react-flow__handle.source', 0), await center(page, '.react-flow__node .react-flow__handle.target', 1));
    await expect(page.locator('.react-flow__edge')).toHaveCount(1);
    await page.getByRole('button', { name: 'Adicionar rótulo' }).click();
    await page.getByLabel('Rótulo da conexão').fill('evolui para');
    await page.getByLabel('Rótulo da conexão').press('Enter');
    await expect(page.getByRole('status').filter({ hasText: /Salvo/ })).toBeVisible({ timeout: 10_000 });
  });

  await page.getByRole('button', { name: 'Desafiar este mapa' }).click();
  await expect(page).toHaveURL(/\/desafiar$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Desafiar este mapa');
  await expect(page.getByRole('complementary', { name: 'No mapa' })).toBeVisible();

  const seen = { self: 0, options: 0, noRubric: 0 };
  for (let n = 0; n < 12; n++) {
    const summary = page.getByRole('heading', { name: 'Sessão concluída' });
    const reveal = page.getByRole('button', { name: 'Revelar resposta' });
    await expect(summary.or(reveal)).toBeVisible();
    if (await summary.isVisible()) break;
    if (await page.getByText('Sem rubrica aprovada: autoavaliação').isVisible()) {
      seen.noRubric++; // a fresh student's card has no rubric: no "Escrever"
      await expect(page.getByLabel('Sua resposta')).toHaveCount(0);
    }
    if (seen.options === 0 && seen.self > 0 && (await page.getByRole('radiogroup', { name: 'Alternativas' }).count())) {
      await page.getByRole('radiogroup', { name: 'Alternativas' }).getByRole('radio').first().click();
      await page.getByRole('button', { name: 'Confirmar alternativa' }).click();
      seen.options++;
    } else {
      await reveal.click();
      seen.self++;
    }
    await expect(page.getByRole('group', { name: 'Como foi?' })).toBeVisible();
    await page.getByRole('button', { name: /^Bom/ }).click();
  }

  await expect(page.getByRole('heading', { name: 'Sessão concluída' })).toBeVisible();
  expect(seen.self).toBeGreaterThan(0);
  expect(seen.noRubric).toBeGreaterThan(0);
  await expect(page.getByRole('button', { name: 'Mais 5' })).toBeVisible();
  const events = await page.evaluate(() => (window.__remoaEvents ?? []).map((e) => e.event));
  expect(events).toEqual(expect.arrayContaining(['challenge_started', 'answer_submitted', 'challenge_finished']));

  await page.getByRole('link', { name: 'Voltar para Revisar hoje' }).click();
  await expect(page).toHaveURL(/\/revisar$/);
});
