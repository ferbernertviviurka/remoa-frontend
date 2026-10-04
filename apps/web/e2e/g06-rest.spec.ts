// G06 / QA6: o que g06.spec não cobre: mapa misto no desafio e na fila, tooltip do caso por hover, perfil entre grupos,
// cobertura → Novo mapa com item, e axe nos estados novos (editor redimensionado, Conteúdo, fluxograma virado, caso com tooltip, Falar, perfil, 4 alternativas).
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import { accountUser } from './account/fixture';
import { createMockSepse, signUpAndLogin } from './visual/fixture';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const node = (page: Page, title: string) => page.locator('.react-flow__node').filter({ has: page.getByRole('button', { name: `Selecionar ${title}` }) });
const panel = (page: Page) => page.getByRole('complementary', { name: 'Painel do mapa' });
const axe = async (page: Page) => {
  await page.waitForTimeout(700);
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).exclude('nextjs-portal').analyze();
  return r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`);
};

test.use({ viewport: { width: 1440, height: 900 }, colorScheme: 'light' });

type Seed = { title: string; type: 'concept' | 'note' | 'flow' | 'case'; x: number; y: number; put?: Record<string, unknown> };
async function board(request: APIRequestContext, headers: { authorization: string }, title: string, cards: Seed[]) {
  const call = async (path: string, method: 'POST' | 'PUT', data: unknown) => {
    const r = await request.fetch(`${API}${path}`, { method, headers, data });
    expect(r.ok(), `${path} ${r.status()} ${await r.text()}`).toBeTruthy();
    return (await r.json()).data;
  };
  const id = (await call('/v1/boards', 'POST', { title })).id as string;
  const ids = cards.map(() => crypto.randomUUID());
  await call('/v1/boards/ops', 'POST', {
    ops: cards.map((c, i) => ({ op: 'createCard', opId: crypto.randomUUID(), boardId: id, card: { id: ids[i], type: c.type, title: c.title, position: { x: c.x, y: c.y } } })),
  });
  for (const [i, c] of cards.entries())
    if (c.put) await call(`/v1/cards/${ids[i]}`, 'PUT', { title: c.title, type: c.type, front: null, back: null, source: null, payload: {}, ...c.put });
  return { id, ids };
}

test('misto: Conteúdo nunca vira item do desafio nem da fila; só Pergunta e Resposta', async ({ page, request }) => {
  test.setTimeout(150_000);
  const { headers } = await signUpAndLogin(page, request);
  const { id, ids } = await board(request, headers, 'Misto', [
    { title: 'Pergunta Alfa', type: 'concept', x: 40, y: 80, put: { front: 'Alfa?', back: 'Resposta alfa' } },
    { title: 'Pergunta Beta', type: 'concept', x: 400, y: 80, put: { front: 'Beta?', back: 'Resposta beta' } },
    { title: 'Conteúdo Gama', type: 'note', x: 40, y: 380, put: { front: 'Texto gama' } },
    { title: 'Conteúdo Delta', type: 'note', x: 400, y: 380, put: { front: 'Texto delta' } },
  ]);
  const board$ = JSON.stringify(await (await request.get(`${API}/v1/review/queue?boardId=${id}&limit=50`, { headers })).json());
  const daily = JSON.stringify(await (await request.get(`${API}/v1/review/queue?limit=50`, { headers })).json());
  for (const q of [board$, daily]) {
    expect(q).not.toContain(ids[2]);
    expect(q).not.toContain(ids[3]);
  }
  expect(board$).toContain(ids[0]!);

  await page.goto(`/app/mapas/${id}?modo=desafio`);
  let asked = 0;
  for (let n = 0; n < 8; n++) {
    const summary = page.getByRole('heading', { name: 'Sessão concluída' });
    const reveal = page.getByRole('button', { name: 'Revelar resposta' });
    await expect(summary.or(reveal.first())).toBeVisible();
    if (await summary.isVisible()) break;
    await expect(panel(page)).not.toContainText(/Conteúdo (Gama|Delta)|Texto (gama|delta)/);
    await reveal.first().click();
    asked++;
    await page.getByRole('button', { name: /^Bom/ }).click();
  }
  await expect(page.getByRole('heading', { name: 'Sessão concluída' })).toBeVisible();
  expect(asked).toBe(2);

  await page.goto('/app/revisar');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.locator('main')).not.toContainText(/Conteúdo (Gama|Delta)/);
});

test('caso: o tooltip da etapa abre por hover e fecha com Escape; axe com ele aberto', async ({ page, request }) => {
  test.setTimeout(120_000);
  const { headers } = await signUpAndLogin(page, request);
  const { id } = await board(request, headers, 'Caso', [{ title: 'Caso sepse', type: 'case', x: 80, y: 120, put: { payload: { caseSteps: [{ stage: 'presentation', text: 'Febre' }] } } }]);
  await page.goto(`/app/mapas/${id}`);
  const card = node(page, 'Caso sepse');
  await card.getByRole('button', { name: /Diagnóstico/ }).hover();
  await expect(page.getByRole('tooltip')).toContainText('pergunta o diagnóstico');
  expect(await axe(page), 'caso com tooltip').toEqual([]);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('tooltip')).toHaveCount(0);
});

test('perfil: escolher objetivo de outro grupo e momento novo persiste após recarregar; axe', async ({ page, request }) => {
  test.setTimeout(120_000);
  await accountUser(page, request);
  await page.goto('/app/conta/perfil');
  const residencia = page.getByRole('radiogroup', { name: /^Objetivo de prova: Residência/ });
  await residencia.getByRole('radio', { name: 'USP' }).click();
  await expect(residencia.getByRole('radio', { name: 'USP' })).toBeChecked();
  await page.getByRole('radiogroup', { name: 'Momento da graduação' }).getByRole('radio', { name: 'Residente' }).click();
  await expect(page.getByText('Salvo.').first()).toBeVisible();
  await expect(page.getByRole('radiogroup', { name: /^Objetivo de prova: Enamed/ }).getByRole('radio', { checked: true })).toHaveCount(0); // one goal only
  await page.reload();
  await expect(page.getByRole('radiogroup', { name: /^Objetivo de prova: Residência/ }).getByRole('radio', { name: 'USP' })).toBeChecked();
  await expect(page.getByRole('radiogroup', { name: 'Momento da graduação' }).getByRole('radio', { name: 'Residente' })).toBeChecked();
  expect(await axe(page), 'perfil').toEqual([]);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'perfil 390 sem scroll horizontal').toBe(true);
});

test('cobertura → "Criar mapa para este tema" abre o Novo mapa com o item pré-selecionado', async ({ page, request }) => {
  test.setTimeout(120_000);
  await signUpAndLogin(page, request);
  await page.goto('/app/cobertura');
  const link = page.getByRole('link', { name: /^Criar mapa para / }).first();
  const label = (await link.getAttribute('aria-label'))!.replace(/^Criar mapa para /, '');
  await link.click();
  await expect(page).toHaveURL(/\/mapas\/novo\?item=/);
  await expect(page.getByLabel('Nome do mapa')).toHaveCount(1); // the slide keeps the outgoing step mounted for a moment
  await expect(page.getByLabel('Nome do mapa')).toHaveValue(label);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'novo mapa 390 sem scroll horizontal').toBe(true);
});

test('axe: Novo mapa nas 4 alternativas e em 390x844', async ({ page, request }) => {
  test.setTimeout(150_000);
  await signUpAndLogin(page, request);
  for (const c of ['pdf', 'anki', 'pronto', 'blank']) {
    await page.goto(`/app/mapas/novo?caminho=${c}`);
    await expect(page.getByRole('heading', { level: 1, name: 'Como você quer começar?' })).toBeVisible();
    expect(await axe(page), `novo ${c} passo 1`).toEqual([]);
    await page.getByRole('button', { name: 'Continuar' }).click();
    expect(await axe(page), `novo ${c} passo 2`).toEqual([]);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/app/mapas/novo?caminho=anki');
  expect(await axe(page), 'novo anki 390').toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'sem scroll horizontal').toBe(true);
});

test('axe: editor com card redimensionado e painel aberto, Conteúdo, fluxograma virado; desafio Falar', async ({ page, request }) => {
  test.setTimeout(180_000);
  const { userId, headers } = await signUpAndLogin(page, request);
  const { id } = await board(request, headers, 'Estados', [
    { title: 'Sepse', type: 'concept', x: 80, y: 80, put: { front: 'Definição?', back: 'Disfunção orgânica' } },
    { title: 'Fisiopatologia', type: 'note', x: 480, y: 80, put: { front: 'Resposta desregulada do hospedeiro.' } },
    { title: 'Pacote', type: 'flow', x: 80, y: 420, put: { payload: { steps: [{ id: 's1', text: 'Lactato' }, { id: 's2', text: 'Hemoculturas' }, { id: 's3', text: 'Antibiótico' }] } } },
  ]);
  await page.goto(`/app/mapas/${id}`);
  const card = node(page, 'Sepse');
  await card.getByRole('button', { name: 'Selecionar Sepse' }).click();
  const h = (await card.locator('.react-flow__resize-control.bottom.right').boundingBox())!;
  await page.mouse.move(h.x + h.width / 2, h.y + h.height / 2);
  await page.mouse.down();
  await page.mouse.move(h.x + 80, h.y + 60, { steps: 6 });
  await page.mouse.up();
  await expect(page.locator('aside.cv-panel')).toHaveAttribute('data-state', 'open');
  await expect(panel(page).getByRole('heading', { level: 2, name: 'Sepse' })).toBeFocused();
  expect(await axe(page), 'editor redimensionado + painel aberto').toEqual([]);

  await node(page, 'Fisiopatologia').getByRole('button', { name: 'Selecionar Fisiopatologia' }).click();
  await expect(panel(page).getByRole('heading', { level: 2, name: 'Fisiopatologia' })).toBeVisible();
  expect(await axe(page), 'Conteúdo').toEqual([]);

  const flow = node(page, 'Pacote');
  await flow.getByRole('button', { name: 'Ver resposta' }).click();
  await expect(flow.getByRole('button', { name: 'Ver pergunta' })).toBeVisible();
  expect(await axe(page), 'fluxograma virado (timeline)').toEqual([]);

  const sepse = await createMockSepse(request, headers, userId);
  await page.goto(`/app/mapas/${sepse}?modo=desafio`);
  await page.getByRole('group', { name: 'Como responder' }).getByRole('button', { name: 'Falar' }).click();
  await expect(panel(page).getByText('Em breve', { exact: true })).toBeVisible();
  expect(await axe(page), 'desafio Falar + Em breve').toEqual([]);
});
