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

test('desafiar este mapa: mínimo de 10 cards, opções, Eu respondo (Acertei/Errei), conexão oculta e resumo', async ({ page }) => {
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

  // G14 ponto 18 (D-579/D-603): below 10 cards the button stays focusable and explains what is missing
  const challengeBtn = page.getByRole('button', { name: 'Desafiar este mapa' }).first();
  await expect(challengeBtn).toHaveAttribute('aria-disabled', 'true');
  await challengeBtn.click({ force: true }); // a tap on an aria-disabled button: Playwright counts it as not enabled
  await expect(page.getByRole('tooltip')).toContainText('Faltam 7');
  await expect(page).not.toHaveURL(/modo=desafio/);

  await test.step('mais 7 cards: chega ao mínimo de 10', async () => {
    await page.keyboard.press('Escape');
    for (let i = 1; i <= 7; i++) {
      await tool(page, 'Adicionar Pergunta e Resposta');
      await form(page).getByLabel('Título').fill(`Conceito ${i}`);
      await form(page).getByLabel('Resposta', { exact: true }).fill(`Resposta ${i}`);
      await form(page).getByRole('button', { name: 'Salvar' }).click();
      await expect(form(page)).toHaveCount(0);
    }
    await expect(page.getByRole('status').filter({ hasText: /Salvo/ })).toBeVisible({ timeout: 10_000 });
  });

  // G14 ponto 21: options dialog (Eu respondo / IA "Em breve"; Aleatório / Seguindo o fluxo das setas)
  await expect(challengeBtn).not.toHaveAttribute('aria-disabled', 'true');
  await challengeBtn.click();
  const setup = page.getByRole('dialog', { name: 'Desafiar este mapa' });
  await expect(setup.getByRole('button', { name: /IA responde/ })).toBeEnabled();
  await setup.getByRole('button', { name: /Seguindo o fluxo das setas/ }).click();
  const started = page.waitForRequest((r) => r.url().endsWith('/v1/challenge/start'));
  const camera = () => page.locator('.react-flow__viewport').getAttribute('style');
  await page.setViewportSize({ width: 1440, height: 900 }); // D-689: room for the 125% zoom-in (at 720 px tall the card is kept at 100%)
  const before = await camera();
  await setup.getByRole('button', { name: 'Começar desafio' }).click();
  expect((await started).postDataJSON()).toMatchObject({ kind: 'board', options: { gradingMode: 'self', order: 'flow', answerMode: 'write' } });
  await expect(page).toHaveURL(/\?modo=desafio$/);
  await expect(page.getByRole('complementary', { name: 'Painel do mapa' }).getByRole('progressbar', { name: 'Progresso da sessão' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Voz/ })).toBeDisabled();
  // D-689: the camera zooms in (animated) on the tested card
  await expect.poll(async () => Number(/scale\(([\d.]+)\)/.exec((await camera()) ?? '')?.[1])).toBeGreaterThan(Number(/scale\(([\d.]+)\)/.exec(before ?? '')?.[1]));

  const seen = { written: 0, revealed: 0, edgeMasked: 0 };
  for (let n = 0; n < 15; n++) {
    const summary = page.getByRole('heading', { name: 'Sessão concluída' });
    const reveal = page.getByRole('button', { name: 'Revelar resposta' });
    await expect(summary.or(reveal.first())).toBeVisible();
    if (await summary.isVisible()) break;
    if (await page.getByText(/^O que liga /).isVisible()) {
      // the label of the connection being asked is the answer: not in the page before /answer
      await expect(page.locator('body')).not.toContainText('evolui para');
      seen.edgeMasked++;
    }
    if (seen.written === 0) {
      await page.getByLabel('Sua resposta').fill('minha resposta');
      await reveal.first().click();
      await expect(page.getByText('minha resposta')).toBeVisible();
      seen.written++;
    } else {
      // G14: Space reveals; a press before the card is interactive (load) is lost, so repeat until the answer shows
      await expect(async () => {
        if (!(await page.getByRole('group', { name: 'Você acertou?' }).isVisible())) await page.keyboard.press('Space');
        await expect(page.getByRole('group', { name: 'Você acertou?' })).toBeVisible({ timeout: 2000 });
      }).toPass({ timeout: 15_000 });
      seen.revealed++;
    }
    await expect(page.getByRole('group', { name: 'Você acertou?' })).toBeVisible();
    if (n === 0) await page.getByRole('button', { name: /^Errei/ }).click();
    else await page.keyboard.press('2'); // Acertei
  }

  await expect(page.getByRole('heading', { name: 'Sessão concluída' })).toBeVisible();
  expect(seen.written + seen.revealed).toBeGreaterThan(1);
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
