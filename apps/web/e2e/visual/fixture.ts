// Shared by visual + a11y specs: fresh user via Supabase/API, optional "Sepse" board (test fixture, not content).
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { expect, type APIRequestContext, type Page } from '@playwright/test';
import { formReady } from '../sign-up';

const env = (k: string) =>
  process.env[k] ?? new RegExp(`^${k}="?([^"\\n]*)"?$`, 'm').exec(readFileSync('.env.local', 'utf8'))?.[1] ?? '';
const SUPABASE = env('NEXT_PUBLIC_SUPABASE_URL');
const ANON = env('NEXT_PUBLIC_SUPABASE_ANON_KEY');
const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export async function signUpAndLogin(page: Page, request: APIRequestContext) {
  const email = `e2e-visual-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@remoa.test`;
  const password = 'senha-forte-123';
  const signup = await request.post(`${SUPABASE}/auth/v1/signup`, { headers: { apikey: ANON }, data: { email, password } });
  const su = await signup.json();
  const token = su.access_token as string;
  await request.post(`${API}/v1/onboarding/complete`, { headers: { authorization: `Bearer ${token}` } }).catch(() => undefined); // F12: skip the onboarding redirect
  await expect(async () => { // retried: a submit before hydration is a native GET
    await page.goto('/entrar');
    await formReady(page);
    await page.getByLabel('E-mail').fill(email);
    await page.getByLabel('Senha').fill(password);
    await page.getByRole('button', { name: 'Entrar', exact: true }).click();
    await expect(page).toHaveURL(/\/(app\/hoje)?$/, { timeout: 4000 }); // D-086: pós-login cai no Hoje
    await page.goto('/app/mapas');
  }).toPass({ timeout: 30_000 });
  return { email, userId: su.user.id as string, headers: { authorization: `Bearer ${token}` } };
}

const titles = ['Sepse', 'Choque séptico', 'Lactato', 'Culturas', 'Antibiótico precoce', 'Disfunção orgânica'];
const pos = [[320, 0], [0, 180], [320, 180], [640, 180], [160, 360], [480, 360]];
const links: [number, number, string][] = [[0, 1, 'pode evoluir para'], [1, 2, 'eleva'], [0, 3, 'colher'], [3, 4, 'antes de'], [0, 5, 'causa'], [5, 2, 'reflete']];

export async function createSepseBoard(request: APIRequestContext, headers: { authorization: string }) {
  const board = (await (await request.post(`${API}/v1/boards`, { headers, data: { title: 'Sepse' } })).json()).data.id as string;
  const ids = titles.map(() => crypto.randomUUID());
  const ops = [
    ...ids.map((id, i) => ({ op: 'createCard', opId: crypto.randomUUID(), boardId: board, card: { id, type: 'concept', title: titles[i], position: { x: pos[i]![0]!, y: pos[i]![1]! } } })),
    ...links.map(([a, b, label]) => ({ op: 'createEdge', opId: crypto.randomUUID(), boardId: board, edge: { id: crypto.randomUUID(), fromCardId: ids[a], toCardId: ids[b], label } })),
  ];
  expect((await request.post(`${API}/v1/boards/ops`, { headers, data: { ops } })).status()).toBe(200);
  return board;
}

// ---- G01 v2: dados do mock (Editor.dc.html "Sepse" + biblioteca) que o produto consegue reproduzir ----
type Headers = { authorization: string };
const call = async <T>(request: APIRequestContext, headers: Headers, path: string, method: 'GET' | 'POST' | 'PUT' = 'GET', data?: unknown) => {
  const r = await request.fetch(`${API}${path}`, { method, headers, data });
  expect(r.ok(), `${path} ${r.status()}`).toBeTruthy();
  return (await r.json()).data as T;
};
const psql = (sql: string) => {
  const db = process.env.DATABASE_URL ?? /DATABASE_URL="?([^"\n]*)/.exec(readFileSync('../../../remoa-backend/.env', 'utf8'))?.[1] ?? '';
  execFileSync('psql', [db, '-q', '-c', sql]);
};
const DAY = 86_400_000;
// FSRS-6 default decay: lastReview such that R(t, S=10d) = r.
const elapsedDays = (r: number) => { const d = 0.1542; return ((Math.pow(r, -1 / d) - 1) / (Math.pow(0.9, -1 / d) - 1)) * 10; };

type MockNode = [key: string, type: 'concept' | 'case' | 'flow' | 'image', title: string, x: number, y: number, r?: number, dueInDays?: number];
type MockEdge = [from: string, to: string, label: string];

async function mockBoard(request: APIRequestContext, headers: Headers, userId: string, title: string, nodes: MockNode[], edges: MockEdge[], matrixItemId: string | null) {
  const board = (await call<{ id: string }>(request, headers, '/v1/boards', 'POST', { title, area: 'CM', matrixItemId })).id;
  const id = Object.fromEntries(nodes.map(([k]) => [k, crypto.randomUUID()])) as Record<string, string>;
  await call(request, headers, '/v1/boards/ops', 'POST', { ops: [
    ...nodes.map(([k, type, t, x, y]) => ({ op: 'createCard', opId: crypto.randomUUID(), boardId: board, card: { id: id[k], type, title: t, position: { x, y } } })),
    ...edges.map(([a, b, label]) => ({ op: 'createEdge', opId: crypto.randomUUID(), boardId: board, edge: { id: crypto.randomUUID(), fromCardId: id[a], toCardId: id[b], label } })),
  ] });
  const now = Date.now();
  const rows = nodes.filter((n) => n[5] != null).map((n) => {
    const last = new Date(now - elapsedDays(n[5]!) * DAY).toISOString();
    const due = new Date(n[6] ? now + n[6] * DAY : now - 3_600_000).toISOString();
    return `('${userId}','${id[n[0]]}','',10,5,'${due}',3,0,'${last}','review',0,10)`;
  });
  if (rows.length) psql(`insert into fsrs_state (user_id, card_id, sub_id, stability, difficulty, due, reps, lapses, last_review, state, learning_steps, scheduled_days) values ${rows.join(',')}`);
  return { board, id };
}

/** Mapa "Sepse" do Editor.dc.html: 6 cards (tipos, posições, rótulos), conteúdo e estados FSRS (Choque séptico e Pacote vencem hoje a 58%/64%). */
export async function createMockSepse(request: APIRequestContext, headers: Headers, userId: string) {
  const items = await call<{ id: string; title: string }[]>(request, headers, '/v1/matrix/items?area=CM');
  const matrixItemId = items.find((i) => /sepse/i.test(i.title))?.id ?? null;
  const { board, id } = await mockBoard(request, headers, userId, 'Sepse', [
    ['sepse', 'concept', 'Sepse', 64, 150, 0.94, 6], ['triagem', 'concept', 'Triagem', 376, 120, 0.71, 3], ['caso12', 'case', 'Caso 12', 672, 130, 0.83, 4],
    ['choque', 'concept', 'Choque séptico', 64, 380, 0.58, 0], ['pacote', 'flow', 'Pacote da 1ª hora', 368, 350, 0.64, 0], ['rx', 'image', 'Rx de tórax: foco', 672, 380],
  ], [['sepse', 'triagem', 'suspeita'], ['triagem', 'caso12', 'treina'], ['sepse', 'choque', 'evolui para'], ['triagem', 'pacote', 'positiva'], ['pacote', 'choque', 'PAM < 65'], ['rx', 'pacote', 'foco']], matrixItemId);
  const put = (cid: string, body: object) => call(request, headers, `/v1/cards/${cid}`, 'PUT', { front: null, source: null, payload: {}, ...body });
  await put(id.sepse!, { title: 'Sepse', type: 'concept', back: 'Disfunção orgânica grave por resposta desregulada à infecção.', source: 'Sepsis-3 · Surviving Sepsis Campaign 2021' });
  await put(id.triagem!, { title: 'Triagem', type: 'concept', back: 'SIRS, NEWS2 ou qSOFA: nenhum isolado afasta sepse.' });
  await put(id.choque!, { title: 'Choque séptico', type: 'concept', back: 'Vasopressor para PAM ≥ 65 e lactato > 2 apesar de volume.', source: 'Sepsis-3 · Surviving Sepsis Campaign 2021' });
  await put(id.caso12!, { title: 'Caso 12', type: 'case', back: null, payload: { caseSteps: [{ stage: 'workup', text: 'PA 80/50, lactato 3,4' }, { stage: 'diagnosis', text: 'Choque séptico' }, { stage: 'management', text: 'Pacote da 1ª hora' }] } });
  await put(id.pacote!, { title: 'Pacote da 1ª hora', type: 'flow', back: null, payload: { steps: ['Dosar lactato', 'Hemoculturas antes do ATB', 'ATB de amplo espectro', 'Cristaloide 30 mL/kg', 'Noradrenalina se PAM < 65'].map((text, i) => ({ id: `s${i + 1}`, text })) } });
  psql(`update cards set rubric = '{"points":[{"text":"Noradrenalina se PAM < 65","essential":true}],"source":"Sepsis-3","version":1,"status":"rascunho","reviewerId":null}'::jsonb where board_id = '${board}'`);
  const pacoteSub = `('${userId}','${id.pacote}','s5',10,5,'${new Date(Date.now() - 3_600_000).toISOString()}',3,1,'${new Date(Date.now() - elapsedDays(0.5) * DAY).toISOString()}','review',0,10)`;
  psql(`insert into fsrs_state (user_id, card_id, sub_id, stability, difficulty, due, reps, lapses, last_review, state, learning_steps, scheduled_days) values ${pacoteSub}`);
  return board;
}

/** Hoje/Meus mapas completos: Sepse + 2 mapas menores com vencidos + tentativas nos 3 dias anteriores (semana preenchida). */
export async function seedMock(request: APIRequestContext, headers: Headers, userId: string) {
  // D-108: Free has 2 maps. The mock needs 3 (a legacy account keeps what it has), so create them as Pro and go back to Free.
  psql(`insert into subscriptions (user_id, plan, status) values ('${userId}','pro','active') on conflict (user_id) do update set plan='pro'`);
  try {
    return await seedMockBoards(request, headers, userId);
  } finally {
    psql(`delete from subscriptions where user_id = '${userId}'`);
  }
}

async function seedMockBoards(request: APIRequestContext, headers: Headers, userId: string) {
  const sepse = await createMockSepse(request, headers, userId);
  const ring = (t: string): [MockNode[], MockEdge[]] => [
    [['a', 'concept', t, 0, 0, 0.9, 5], ['b', 'concept', 'Conceito B', 300, 0, 0.6, 0], ['c', 'concept', 'Conceito C', 0, 180, 0.8, 4], ['d', 'concept', 'Conceito D', 300, 180, 0.55, 0]],
    [['a', 'b', 'leva a'], ['a', 'c', 'inclui'], ['b', 'd', 'causa']],
  ];
  const [n1, e1] = ring('Insuficiência cardíaca'); const [n2, e2] = ring('Pneumonia');
  const hf = await mockBoard(request, headers, userId, 'Insuficiência cardíaca', n1, e1, null);
  const pn = await mockBoard(request, headers, userId, 'Pneumonia', n2, e2, null);
  const cardId = Object.values(hf.id)[0]!;
  const att = [3, 3, 3, 3, 3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1]
    .map((d, i) => `(gen_random_uuid(),'${userId}','${cardId}','a${i}','hidden_card','text',3,now() - interval '${d} days')`).join(',');
  psql(`insert into attempts (id, user_id, card_id, sub_id, mode, input_kind, grade, created_at) values ${att}`);
  return { sepse, hf: hf.board, pn: pn.board };
}

export const mask = (page: Page, email: string) => [
  page.getByText(/Salvo (há|agora|ontem)/), page.getByText(email), page.locator('time'),
  page.locator('nextjs-portal'), // indicador do next dev
];
