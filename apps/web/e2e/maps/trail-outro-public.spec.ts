// F31 (G23 QA): trilha (ordem + pré-requisito), mapa de "Outro assunto", /mapas-prontos público e axe na biblioteca.
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { API, accountUser, psql } from '../account/fixture';

const first = (sql: string) => psql(sql).split('\n')[0]!;
const axe = async (page: Page) => {
  await page.waitForTimeout(500);
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).exclude('nextjs-portal').analyze();
  return r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`);
};
const stamp = Date.now();

test('trilha: "Desafiar este mapa" oferece trilha/Misturar e o card dependente não vem antes do pré-requisito', async ({ page, request }) => {
  test.setTimeout(150_000);
  const { userId } = await accountUser(page, request);
  const board = first(`insert into boards (user_id, title, area, path) values ('${userId}', 'Trilha ${stamp}', 'CM', '{"slug":"trilha-${stamp}"}'::jsonb) returning id`);
  // `order` is the reverse of the trail; "Trilha 1" (path_order 1) depends on "Trilha 5" (path_order 5): it must wait until 5 is reviewed.
  const ids: string[] = [];
  for (let n = 1; n <= 10; n++) ids.push(first(`insert into cards (board_id, type, title, back, status, "order", path_order, x, y) values ('${board}', 'concept', 'Trilha ${n}', 'Verso ${n}', 'approved', ${20 - n}, ${n}, ${(n % 5) * 300}, ${Math.floor(n / 5) * 200}) returning id`));
  psql(`insert into card_prereqs (card_id, prereq_card_id) values ('${ids[0]}', '${ids[4]}')`);

  await page.goto(`/app/mapas/${board}`);
  await page.getByRole('button', { name: 'Desafiar este mapa' }).first().click();
  const setup = page.getByRole('dialog', { name: 'Desafiar este mapa' });
  await expect(setup.getByText('Em que ordem entram os cards novos?')).toBeVisible();
  await expect(setup.getByRole('button', { name: /Estudar na ordem da trilha/ })).toHaveAttribute('aria-pressed', 'true'); // default
  await expect(setup.getByRole('button', { name: /Misturar/ })).toHaveAttribute('aria-pressed', 'false');

  const started = page.waitForResponse((r) => r.url().endsWith('/v1/challenge/start'));
  await setup.getByRole('button', { name: 'Começar desafio' }).click();
  const res = await started;
  expect(JSON.stringify(res.request().postDataJSON())).toContain('trail');
  // trail order: "Trilha 1" waits for its prerequisite ("Trilha 5") to be reviewed, so it is not in the session; the rest follows path_order
  const order = ((await res.json()).data.items as { cardId: string }[]).map((i) => ids.indexOf(i.cardId) + 1);
  expect(order).not.toContain(1);
  expect(order.slice(0, 4)).toEqual([2, 3, 4, 5]);
  await expect(page).toHaveURL(/\?modo=desafio$/);
  await expect(page.getByRole('progressbar', { name: 'Progresso da sessão' })).toBeVisible();
});

test('Outro assunto: cria o mapa e a visão compartilhada não mostra a faixa médica', async ({ browser, request }) => {
  test.setTimeout(120_000);
  const page = await (await browser.newContext()).newPage();
  const { headers } = await accountUser(page, request);
  await page.goto('/app/mapas/novo?caminho=blank');
  await expect(async () => {
    await page.getByRole('button', { name: 'Outro assunto' }).click({ timeout: 5000 });
    await page.getByLabel('Nome do mapa').fill(`Outro ${stamp}`, { timeout: 5000 });
    await page.getByRole('button', { name: 'Criar mapa', exact: true }).click({ timeout: 5000 });
    await expect(page).toHaveURL(/\/mapas\/[0-9a-f-]{36}$/, { timeout: 8000 });
  }).toPass({ timeout: 45_000 });
  const boardId = page.url().split('/').pop()!;
  expect(psql(`select area from boards where id = '${boardId}'`)).toBe('OUTRO');

  const share = await request.put(`${API}/v1/boards/${boardId}/share`, { headers, data: { access: 'public' } });
  expect(share.status()).toBe(200);
  const url = (await share.json()).data.url as string;
  const anon = await (await browser.newContext()).newPage();
  await anon.goto(url);
  await expect(anon.getByRole('heading', { level: 1, name: `Outro ${stamp}` })).toBeVisible();
  await expect(anon.getByText('Outro assunto').first()).toBeVisible();
  await expect(anon.getByTestId('shared-board-disclaimer')).toHaveCount(0);
});

// ISR (revalidate 1h): numa rodada repetida contra o mesmo servidor a lista pode vir do cache; reiniciar o servidor com o diretório de build limpo (rm -rf .next-qa2).
test('/mapas-prontos público: aprovado com tag Top 10 e amostra de 10 cards; seed_draft dá 404', async ({ browser, request }) => {
  test.setTimeout(120_000);
  const { userId } = await accountUser(await (await browser.newContext()).newPage(), request, 'Autora');
  const mk = (slug: string, title: string, status: string) =>
    first(`insert into boards (user_id, title, area, status, badges, path) values ('${userId}', '${title}', 'CM', '${status}', array['top10_enamed'], '{"slug":"${slug}"}'::jsonb) returning id`);
  const ok = mk(`pronto-${stamp}`, `Pronto ${stamp}`, 'seed_approved');
  mk(`rascunho-${stamp}`, `Rascunho ${stamp}`, 'seed_draft');
  for (let n = 1; n <= 12; n++) psql(`insert into cards (board_id, type, title, back, status, "order", path_order) values ('${ok}', 'concept', 'Amostra ${n}', 'Verso', 'approved', ${n}, ${n})`);

  const anon = await (await browser.newContext()).newPage();
  await anon.goto('/mapas-prontos');
  const item = anon.getByRole('listitem').filter({ hasText: `Pronto ${stamp}` });
  await expect(item).toContainText('Top 10 ENAMED');
  await expect(anon.getByText(`Rascunho ${stamp}`)).toHaveCount(0);
  expect(await axe(anon), 'axe /mapas-prontos').toEqual([]);

  await item.getByRole('link', { name: `Pronto ${stamp}` }).click();
  await expect(anon.getByRole('heading', { level: 1, name: `Pronto ${stamp}` })).toBeVisible();
  await expect(anon.getByText('Top 10 ENAMED').first()).toBeVisible();
  await expect(anon.locator('#seed-sample ~ ol > li, section[aria-labelledby=seed-sample] ol > li')).toHaveCount(10);

  expect((await anon.goto(`/mapas-prontos/rascunho-${stamp}`))!.status()).toBe(404);
});

test('axe: biblioteca em /app/mapas', async ({ page, request }) => {
  await accountUser(page, request);
  await page.goto('/app/mapas?aba=biblioteca');
  await expect(page.getByRole('heading', { name: 'Biblioteca de mapas prontos' })).toBeVisible();
  expect(await axe(page), 'axe biblioteca').toEqual([]);
});
