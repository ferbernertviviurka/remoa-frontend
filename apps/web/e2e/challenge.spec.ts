import { createBlankBoard } from './create-map';
import { signUpViaForm } from './sign-up';
import { expect, test, type Page } from '@playwright/test';

const inspector = (page: Page) => page.getByRole('complementary', { name: 'Painel do mapa' });
const tool = (page: Page, name: string) => page.getByRole('toolbar', { name: 'Ferramentas do mapa' }).getByRole('button', { name }).click();
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

test('desafiar este mapa no editor: autoavaliação, opções, conexão oculta e resumo', async ({ page }) => {
  test.setTimeout(180_000);
  await signUpViaForm(page, `e2e-challenge-${Date.now()}@remoa.test`);
  await expect(page).toHaveURL(/\/app\/hoje$/); // D-321: pós-login cai no Hoje
  await page.goto('/app/mapas');
  await createBlankBoard(page, 'Sepse');
  await expect(page.locator('.react-flow__pane')).toBeVisible();

  await test.step('conceitos, fluxograma de 3 passos e uma conexão com rótulo', async () => {
    for (const [title, back] of [['Sepse', 'Disfunção orgânica por resposta desregulada à infecção'], ['Choque séptico', 'Sepse com hipotensão e lactato alto']]) {
      await tool(page, 'Adicionar Pergunta e Resposta');
      await expect(form(page)).toBeVisible();
      await form(page).getByLabel('Título').fill(title!);
      await form(page).getByLabel('Resposta', { exact: true }).fill(back!);
      await form(page).getByRole('button', { name: 'Salvar' }).click();
      await expect(form(page)).toHaveCount(0);
    }
    await tool(page, 'Adicionar fluxograma');
    await form(page).getByLabel('Título').fill('Pacote da primeira hora');
    await form(page).getByLabel('Passo 1', { exact: true }).fill('Dosar lactato');
    await form(page).getByLabel('Passo 2', { exact: true }).fill('Colher hemoculturas');
    await form(page).getByRole('button', { name: 'Adicionar passo' }).click();
    await form(page).getByLabel('Passo 3', { exact: true }).fill('Antimicrobiano');
    await form(page).getByRole('button', { name: 'Salvar' }).click();
    await expect(form(page)).toHaveCount(0);

    await drag(page, await center(page, '.react-flow__node .react-flow__handle.source', 0), await center(page, '.react-flow__node .react-flow__handle.target', 1));
    await expect(page.locator('.react-flow__edge')).toHaveCount(1);
    await page.locator('.react-flow__edge').first().focus(); // T5: "+ rótulo" shows on the selected edge
    await page.keyboard.press('Enter');
    await page.getByRole('button', { name: 'Adicionar rótulo' }).click();
    await page.getByRole('dialog', { name: 'Rótulo da conexão' }).getByLabel('Rótulo da conexão').fill('evolui para');
    await page.keyboard.press('Enter');
    await expect(page.getByRole('status').filter({ hasText: /Salvo/ })).toBeVisible({ timeout: 10_000 });
  });

  // T6: the challenge is a mode of the editor: the session starts in the panel (no separate page)
  await page.getByRole('button', { name: 'Desafiar este mapa' }).first().click();
  await expect(page).toHaveURL(/\?modo=desafio$/);
  await expect(page.getByRole('complementary', { name: 'Painel do mapa' }).getByRole('progressbar', { name: 'Progresso da sessão' })).toBeVisible();

  const seen = { self: 0, options: 0, noRubric: 0, edgeMasked: 0 };
  for (let n = 0; n < 12; n++) {
    const summary = page.getByRole('heading', { name: 'Sessão concluída' });
    const reveal = page.getByRole('button', { name: 'Revelar resposta' });
    await expect(summary.or(reveal.first())).toBeVisible();
    if (await summary.isVisible()) break;
    if (await page.getByText(/ainda não tem rubrica aprovada/).isVisible()) seen.noRubric++; // a fresh student's card has no rubric
    if (await page.getByText(/^O que liga /).isVisible()) {
      // the label of the connection being asked is the answer: not in the page before /answer
      await expect(page.locator('body')).not.toContainText('evolui para');
      seen.edgeMasked++;
    }
    const options = page.getByRole('group', { name: 'Alternativas' });
    if (seen.options === 0 && seen.self > 0 && (await options.count())) {
      await options.getByRole('button').first().click();
      await page.getByRole('button', { name: 'Confirmar alternativa' }).click();
      seen.options++;
    } else {
      await reveal.first().click();
      seen.self++;
    }
    await expect(page.getByRole('group', { name: /^Como foi lembrar/ })).toBeVisible();
    await page.getByRole('button', { name: /^Bom/ }).click();
  }

  await expect(page.getByRole('heading', { name: 'Sessão concluída' })).toBeVisible();
  expect(seen.self).toBeGreaterThan(0);
  expect(seen.noRubric).toBeGreaterThan(0);
  expect(seen.edgeMasked).toBeGreaterThan(0);
  await expect(page.getByRole('button', { name: 'Mais 5' })).toBeVisible();
  const events = await page.evaluate(() => (window.__remoaEvents ?? []).map((e) => e.event));
  expect(events).toEqual(expect.arrayContaining(['challenge_started', 'answer_submitted', 'challenge_finished']));

  await page.getByRole('button', { name: 'Sair do desafio' }).last().click();
  await expect(page).toHaveURL(/\/mapas\/[^?]+$/);
  await page.goto(page.url().replace(/\/mapas\/([^/?]+).*/, '/mapas/$1/desafiar')); // v1 route redirects to the mode
  await expect(page).toHaveURL(/\?modo=desafio$/);
  await page.getByRole('link', { name: 'Revisar' }).click();
  await expect(page).toHaveURL(/\/revisar$/);
});
