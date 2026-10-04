// F09 FR-2 / FR-3: phone review at 360×740. The map is a list; the challenge is one question, with the answer field.
import { expect, test } from '@playwright/test';
import { psql } from './db';
import { signUpAndLogin } from './visual/fixture';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

// Viewport and browser come from the `pixel-5` / `iphone-12` projects (playwright.config.ts); a desktop project would not be a phone.
test.use({ colorScheme: 'light' });
test.skip(({ isMobile }) => !isMobile, 'phone-only spec');

test('revisão no celular: lista sem canvas, uma pergunta, campo e notas', async ({ page, request }) => {
  test.setTimeout(120_000);
  const { headers } = await signUpAndLogin(page, request);
  const created = await request.post(`${API}/v1/boards`, { headers, data: { title: 'Sepse', area: 'CM' } });
  const board = (await created.json()).data.id as string;
  const cardId = crypto.randomUUID();
  const ops = await request.post(`${API}/v1/boards/ops`, {
    headers,
    data: { ops: [{ op: 'createCard', opId: crypto.randomUUID(), boardId: board, card: { id: cardId, type: 'concept', title: 'Sepse', position: { x: 80, y: 80 } } }] },
  });
  expect(ops.status()).toBe(200);
  const rubric = JSON.stringify({
    points: [{ text: 'Disfunção orgânica', essential: true }],
    source: 'Diretriz',
    version: 1,
    status: 'draft',
    reviewerId: null,
  });
  psql(`update cards set front = 'Qual é a definição?', back = 'Disfunção orgânica por infecção', rubric = $r$${rubric}$r$::jsonb where id = '${cardId}'`);

  await page.goto(`/app/mapas/${board}`);
  await expect(page.getByRole('button', { name: 'Sepse' })).toBeVisible();
  await expect(page.locator('.react-flow')).toHaveCount(0);
  await page.getByRole('button', { name: 'Sepse' }).click();
  await expect(page.getByRole('button', { name: 'Revisar este conceito' })).toBeVisible();
  const edit = page.getByRole('link', { name: 'Editar no computador' });
  await expect(edit).toBeVisible();
  await expect(edit).toHaveAttribute('href', `/app/mapas/${board}`);

  await page.goto(`/app/mapas/${board}?modo=desafio`);
  const field = page.getByLabel('Sua resposta');
  await expect(field).toBeVisible();
  await page.getByRole('button', { name: 'Falar' }).click();
  await expect(field).toBeVisible();
  // D-507 (supersedes D-203): voice is live where the browser has speech recognition; elsewhere the mic is off and says so.
  const hasSpeech = await page.evaluate(() => 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
  const mic = page.getByRole('button', { name: 'Falar a resposta' });
  if (hasSpeech) {
    await expect(mic).toBeEnabled();
    await expect(page.getByText('O áudio não é enviado.')).toBeVisible();
  } else {
    await expect(mic).toBeDisabled();
    await expect(page.getByText('Responder falando ainda não está disponível')).toBeVisible();
  }
  await field.fill('disfunção orgânica');
  await page.getByRole('button', { name: 'Corrigir resposta' }).click();

  const ratings = page.getByRole('group', { name: /^Como foi lembrar/ });
  await expect(ratings).toBeVisible();
  const buttons = ratings.getByRole('button');
  expect(await buttons.count()).toBe(4);
  const box = await buttons.first().boundingBox();
  expect(box!.height).toBeGreaterThanOrEqual(44);
  expect(box!.width).toBeGreaterThanOrEqual(44);
  const neighbors = page.getByRole('list', { name: 'No mapa' });
  if (await neighbors.count()) expect(await neighbors.evaluate((el) => getComputedStyle(el).flexDirection)).toBe('column');
});
