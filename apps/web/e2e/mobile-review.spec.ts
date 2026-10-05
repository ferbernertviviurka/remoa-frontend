// F09 FR-3: phone review at 360×740. The map is the phone canvas (F23); the challenge is one question, with the answer field.
import { expect, test } from '@playwright/test';
import { psql } from './db';
import { signUpAndLogin } from './visual/fixture';
import { padForChallenge } from './challenge-pad';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

// Viewport and browser come from the `pixel-5` / `iphone-12` projects (playwright.config.ts); a desktop project would not be a phone.
test.use({ colorScheme: 'light' });
test.skip(({ isMobile }) => !isMobile, 'phone-only spec');

test('revisão no celular: mapa no celular, uma pergunta, campo e notas', async ({ page, request }) => {
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

  // F23 (D-660): the phone map is the canvas now (features/map/mobile, e2e/map-mobile/*); the peek's "Revisar este conceito" is T6
  await page.goto(`/app/mapas/${board}`);
  await expect(page.locator('[data-mobile-map] .react-flow')).toBeVisible();

  await padForChallenge(request, headers, board, 9); // G14 D-579: 10 cards to challenge
  await page.goto(`/app/mapas/${board}?modo=desafio`);
  const field = page.getByLabel('Sua resposta');
  await expect(field).toBeVisible();
  // G14 D-605: Voz is "Em breve" (disabled); write, reveal, then Acertei/Errei
  const voz = page.getByRole('button', { name: /Voz/ });
  await expect(voz).toBeDisabled();
  await expect(voz).toContainText('Em breve');
  await field.fill('disfunção orgânica');
  await page.getByRole('button', { name: 'Revelar resposta' }).click();

  const ratings = page.getByRole('group', { name: 'Você acertou?' });
  await expect(ratings).toBeVisible();
  const buttons = ratings.getByRole('button');
  expect(await buttons.count()).toBe(2);
  const box = await buttons.first().boundingBox();
  expect(box!.height).toBeGreaterThanOrEqual(44);
  expect(box!.width).toBeGreaterThanOrEqual(44);
  const neighbors = page.getByRole('list', { name: 'No mapa' });
  if (await neighbors.count()) expect(await neighbors.evaluate((el) => getComputedStyle(el).flexDirection)).toBe('column');
});
