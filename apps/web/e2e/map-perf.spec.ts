// FR-6 / T8: 200 cards + ~200 edges, pan for ~2 s, sample requestAnimationFrame deltas.
// Run with `PERF=1 pnpm test:e2e e2e/map-perf.spec.ts`. Headless numbers are indicative only (no GPU, shared CPU):
// confirm in Chrome's Performance panel on a real laptop.
import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

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
  const token = (await signup.json()).access_token as string;
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
    await page.getByLabel('E-mail').fill(email);
    await page.getByLabel('Senha').fill(password);
    await page.getByRole('button', { name: 'Entrar', exact: true }).click();
    await expect(page).toHaveURL(/\/mapas$/, { timeout: 4000 });
  }).toPass({ timeout: 30_000 });
  await page.goto(`/mapas/${board}`);
  await expect(page.locator('.react-flow__node').first()).toBeVisible();
  await expect(page.getByText('200 conceitos · 199 conexões')).toBeVisible();

  const pane = (await page.locator('.react-flow__pane').boundingBox())!;
  const cx = pane.x + pane.width / 2;
  const cy = pane.y + pane.height / 2;

  for (const zoom of ['fit', 'zoom-in'] as const) {
    if (zoom === 'zoom-in') for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Aproximar' }).click();
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
