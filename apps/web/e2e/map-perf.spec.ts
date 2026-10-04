// FR-6 / T8: 200 cards + ~200 edges, pan for ~2 s, sample requestAnimationFrame deltas.
// Run with `PERF=1 pnpm test:e2e e2e/map-perf.spec.ts`. Headless numbers are indicative only (no GPU, shared CPU):
// confirm in Chrome's Performance panel on a real laptop.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { formReady } from './sign-up';

test.skip(!process.env.PERF, 'set PERF=1 to run');

const env = (k: string) =>
  process.env[k] ?? new RegExp(`^${k}="?([^"\\n]*)"?$`, 'm').exec(readFileSync('.env.local', 'utf8'))?.[1] ?? '';
const SUPABASE = env('NEXT_PUBLIC_SUPABASE_URL');
const ANON = env('NEXT_PUBLIC_SUPABASE_ANON_KEY');
const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

test('200 cards: pan fps', async ({ page, request }) => {
  test.setTimeout(120_000);
  const email = `e2e-perf-${Date.now()}@remoa.test`;
  const password = 'senha-forte-123';
  const signup = await request.post(`${SUPABASE}/auth/v1/signup`, { headers: { apikey: ANON }, data: { email, password } });
  const body = await signup.json();
  const token = body.access_token as string;
  await request.post(`${API}/v1/onboarding/complete`, { headers: { authorization: `Bearer ${token}` } }); // F12: skip the onboarding redirect
  // Free allows 50 cards: make the perf user Pro (as visual/fixture.ts seedMock does)
  const db = process.env.DATABASE_URL ?? /DATABASE_URL="?([^"\n]*)/.exec(readFileSync('../../../remoa-backend/.env', 'utf8'))?.[1] ?? '';
  execFileSync('psql', [db, '-q', '-c', `insert into subscriptions (user_id, plan, status) values ('${body.user.id}','pro','active') on conflict (user_id) do update set plan='pro'`]);
  const headers = { authorization: `Bearer ${token}` };
  const board = (await (await request.post(`${API}/v1/boards`, { headers, data: { title: 'Perf 200' } })).json()).data.id as string;

  const ids = Array.from({ length: 200 }, () => crypto.randomUUID());
  const cardOps = ids.map((id, i) => ({
    op: 'createCard', opId: crypto.randomUUID(), boardId: board,
    card: { id, type: (['concept', 'flow', 'case', 'image'] as const)[i % 4], title: `Conceito ${i}`, position: { x: (i % 20) * 296, y: Math.floor(i / 20) * 144 } },
  }));
  const edgeOps = ids.slice(1).map((to, i) => ({
    op: 'createEdge', opId: crypto.randomUUID(), boardId: board,
    edge: { id: crypto.randomUUID(), fromCardId: ids[i], toCardId: to, label: i % 2 ? 'causa' : null },
  }));
  for (const ops of [cardOps, edgeOps]) {
    expect((await request.post(`${API}/v1/boards/ops`, { headers, data: { ops } })).status()).toBe(200);
  }

  await expect(async () => { // retried: a submit before hydration is a native GET and loses the fields
    await page.goto('/entrar');
    await formReady(page);
    await page.getByLabel('E-mail').fill(email);
    await page.getByLabel('Senha').fill(password);
    await page.getByRole('button', { name: 'Entrar', exact: true }).click();
    await expect(page).toHaveURL(/:3000\/(app\/hoje|mapas)?$/, { timeout: 4000 }); // D-086: "/" after login
  }).toPass({ timeout: 30_000 });
  await page.goto(`/app/mapas/${board}`);
  await expect(page.locator('.react-flow__node').first()).toBeVisible();
  // D-098: no card selected = no panel (the 200/199 summary it showed is gone); the canvas has the whole width
  await expect(page.getByRole('complementary', { name: 'Painel do mapa' })).toHaveCount(0);

  const pane = (await page.locator('.react-flow__pane').boundingBox())!;
  const cx = pane.x + pane.width / 2;
  const cy = pane.y + pane.height / 2;

  for (const zoom of ['fit', 'zoom-in', 'challenge'] as const) {
    if (zoom === 'zoom-in') for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Aumentar zoom' }).click();
    if (zoom === 'challenge') {
      // G02 / D-097: the whole viewport under one blur filter + the sharp focus card on top, while panning
      await page.goto(`/app/mapas/${board}?modo=desafio`);
      await expect(page.locator('[data-testid="focus-card"]')).toBeVisible({ timeout: 30_000 });
    }
    await page.waitForTimeout(500);
    await page.evaluate(() => {
      const w = window as unknown as { __frames: number[]; __run?: number };
      w.__frames = [];
      const run = (w.__run = (w.__run ?? 0) + 1); // a new sampler retires the previous one
      let last = performance.now();
      const tick = (n: number) => {
        if (w.__run !== run) return;
        w.__frames.push(n - last);
        last = n;
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    const t0 = Date.now();
    for (let i = 0; Date.now() - t0 < 2000; i++) {
      await page.mouse.move(cx + 200 * Math.sin(i / 8), cy + 120 * Math.cos(i / 8));
    }
    await page.mouse.up();
    const frames = await page.evaluate(() => (window as unknown as { __frames: number[] }).__frames.slice(1));
    const sorted = [...frames].sort((a, b) => a - b);
    const avg = frames.reduce((a, b) => a + b, 0) / frames.length;
    const p95 = sorted[Math.floor(sorted.length * 0.95)]!;
    const nodes = await page.locator('.react-flow__node').count();
    console.log(`PERF[${zoom}] nodes in DOM=${nodes} frames=${frames.length} avgFps=${(1000 / avg).toFixed(1)} avgFrame=${avg.toFixed(1)}ms p95=${p95.toFixed(1)}ms max=${sorted.at(-1)!.toFixed(1)}ms`);
    expect(frames.length).toBeGreaterThan(10);
  }
});
