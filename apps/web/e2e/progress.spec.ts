// F11 FR-1 / FR-5: logged-in /app/progresso shows numbers that match the stored attempts, exports the CSV, and passes axe.
import { readFileSync } from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { psql } from './db';
import { signUpAndLogin } from './visual/fixture';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

test.use({ viewport: { width: 1280, height: 900 }, colorScheme: 'light' });

test('progresso: números das tentativas, exportar CSV e axe', async ({ page, request }) => {
  test.setTimeout(120_000);
  const { headers, userId } = await signUpAndLogin(page, request);
  const board = (await (await request.post(`${API}/v1/boards`, { headers, data: { title: 'Sepse', area: 'CM' } })).json()).data.id as string;
  const cardId = crypto.randomUUID();
  const ops = await request.post(`${API}/v1/boards/ops`, {
    headers,
    data: { ops: [{ op: 'createCard', opId: crypto.randomUUID(), boardId: board, card: { id: cardId, type: 'concept', title: 'Sepse', position: { x: 80, y: 80 } } }] },
  });
  expect(ops.status()).toBe(200);
  // 3 hits (good) + 1 miss (again) today: retention 3/4 = 75%
  for (const grade of [3, 3, 4, 1]) {
    psql(`insert into attempts (user_id, card_id, mode, input_kind, grade) values ('${userId}', '${cardId}', 'hidden_card', 'self', ${grade})`);
  }

  await page.goto('/app/progresso');
  await expect(page.getByRole('heading', { level: 1, name: 'Progresso' })).toBeVisible();
  await expect(page.getByText('Retenção em 7 dias').locator('xpath=..')).toContainText('75%');
  await expect(page.getByText('Retenção em 30 dias').locator('xpath=..')).toContainText('75%');
  await expect(page.getByRole('list', { name: 'Revisões por dia' })).toBeVisible();

  await page.waitForTimeout(1200); // entry animations
  const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).exclude('nextjs-portal').analyze();
  expect(axe.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`)).toEqual([]);

  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Exportar histórico' }).click()]);
  expect(download.suggestedFilename()).toBe('tentativas.csv');
  const lines = readFileSync((await download.path())!, 'utf8').trim().split('\n');
  expect(lines).toHaveLength(5); // header + 4 attempts
});
