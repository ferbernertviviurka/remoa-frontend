// F09 FR-2 / FR-3: phone review at 360×740. The map is a list; the challenge is one question, with the answer field.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { signUpAndLogin } from './visual/fixture';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

function psql(sql: string) {
  const db = process.env.DATABASE_URL ?? /DATABASE_URL="?([^"\n]*)/.exec(readFileSync('../../../remoa-backend/.env', 'utf8'))?.[1] ?? '';
  execFileSync('psql', [db, '-q', '-c', sql]);
}

test.use({ viewport: { width: 360, height: 740 }, hasTouch: true, colorScheme: 'light' });

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

  await page.goto(`/mapas/${board}`);
  await expect(page.getByRole('button', { name: 'Sepse' })).toBeVisible();
  await expect(page.locator('.react-flow')).toHaveCount(0);
  await page.getByRole('button', { name: 'Sepse' }).click();
  await expect(page.getByRole('button', { name: 'Revisar este conceito' })).toBeVisible();
  const edit = page.getByRole('link', { name: 'Editar no computador' });
  await expect(edit).toBeVisible();
  await expect(edit).toHaveAttribute('href', `/mapas/${board}`);

  await page.goto(`/mapas/${board}?modo=desafio`);
  const field = page.getByLabel('Sua resposta');
  await expect(field).toBeVisible();
  await page.getByRole('button', { name: 'Falar' }).click();
  await expect(field).toBeVisible();
  const mic = page.getByRole('button', { name: 'Falar a resposta' });
  const soon = page.getByText('Responder falando ainda não está disponível');
  await expect(mic.or(soon)).toBeVisible();
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
