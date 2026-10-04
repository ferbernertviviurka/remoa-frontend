// F09 FR-5: manifest, service worker, and the start URL answering 200 while offline.
import { expect, test, type Page } from '@playwright/test';
import { psql } from './db';
import { signUpAndLogin } from './visual/fixture';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

async function activateWorker(page: Page) {
  await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;
    const worker = reg.active ?? reg.waiting ?? reg.installing;
    if (worker && worker.state !== 'activated') await new Promise<void>((resolve) => worker.addEventListener('statechange', () => worker.state === 'activated' && resolve()));
    const deadline = Date.now() + 8000;
    while (Date.now() < deadline) {
      const hit = await (await caches.open('remoa-shell-v7')).match('/offline.html');
      if (hit?.ok) return;
      await new Promise((r) => setTimeout(r, 100));
    }
    throw new Error('offline page was not precached');
  });
}


test('o app abre a revisão sem rede a partir do manifesto', async ({ page }) => {
  const manifest = await page.request.get('/manifest.webmanifest');
  expect(manifest.ok()).toBe(true);
  const body = await manifest.json();
  expect(body).toMatchObject({
    name: 'Remoa',
    short_name: 'Remoa',
    start_url: '/app/hoje',
    display: 'standalone',
    theme_color: '#241A5C',
    background_color: '#241A5C',
    lang: 'pt-BR',
  });
  expect(body.icons).toEqual(expect.arrayContaining([
    expect.objectContaining({ sizes: '192x192', type: 'image/png' }),
    expect.objectContaining({ sizes: '512x512', purpose: 'maskable' }),
  ]));

  await page.goto('/');
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href', '/manifest.webmanifest');
  await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;
    const worker = reg.active ?? reg.waiting ?? reg.installing;
    if (!worker) throw new Error('service worker missing');
    if (worker.state !== 'activated') {
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('service worker did not activate')), 8000);
        worker.addEventListener('statechange', () => {
          if (worker.state === 'activated') {
            clearTimeout(timer);
            resolve();
          }
        });
      });
    }
    const deadline = Date.now() + 8000;
    while (Date.now() < deadline) {
      const cache = await caches.open('remoa-shell-v7');
      const hit = await cache.match('/app/hoje');
      if (hit && hit.ok) return;
      await new Promise((r) => setTimeout(r, 100));
    }
    throw new Error('start url was not precached');
  });

  await page.context().setOffline(true);
  const offline = await page.goto('/app/hoje');
  expect(offline?.status()).toBe(200);
  expect(offline?.url()).toContain('/app/hoje');
  await expect(page.getByRole('heading', { name: 'Sem conexão' })).toBeVisible();
});

// D-505: every shell path answers offline with the review page that reads the local queue (regression after the /app move).
test('modo avião: 3 respostas feitas offline sincronizam ao voltar a rede', async ({ page, request }) => {
  test.setTimeout(150_000);
  const { headers, userId } = await signUpAndLogin(page, request);
  const board = (await (await request.post(`${API}/v1/boards`, { headers, data: { title: 'Sepse', area: 'CM' } })).json()).data.id as string;
  const ids = [crypto.randomUUID(), crypto.randomUUID(), crypto.randomUUID()];
  const ops = ids.map((id, i) => ({ op: 'createCard', opId: crypto.randomUUID(), boardId: board, card: { id, type: 'concept', title: `Conceito ${i + 1}`, position: { x: i * 200, y: 80 } } }));
  expect((await request.post(`${API}/v1/boards/ops`, { headers, data: { ops } })).status()).toBe(200);
  const rubric = JSON.stringify({ points: [{ text: 'Disfunção orgânica', essential: true }], source: 'Diretriz', version: 1, status: 'draft', reviewerId: null });
  for (const id of ids) psql(`update cards set front = 'Defina', back = 'Disfunção orgânica', rubric = $r$${rubric}$r$::jsonb where id = '${id}'`);

  const started = await request.post(`${API}/v1/challenge/start`, { headers, data: { kind: 'board', boardId: board, limit: 3 } });
  const session = (await started.json()).data as { items: unknown[] };
  expect(session.items).toHaveLength(3);
  await page.evaluate((data) => localStorage.setItem('remoa-last-session', JSON.stringify({ kind: 'board', boardId: data.boardId, data: data.session })), { boardId: board, session });
  await page.goto('/app/hoje');
  await activateWorker(page);

  await page.context().setOffline(true);
  for (const path of ['/app/m/revisar', '/app/revisar']) {
    const res = await page.goto(path);
    expect(res?.status(), path).toBe(200);
    await expect(page.getByRole('heading', { name: 'Revisão neste aparelho' })).toBeVisible();
  }
  for (let i = 0; i < 3; i += 1) {
    await page.getByLabel('Resposta').fill('disfunção orgânica');
    await page.getByRole('button', { name: 'Corrigir resposta' }).click();
    await page.getByRole('button', { name: 'Bom' }).click();
  }
  await expect(page.getByRole('heading', { name: 'Respostas neste aparelho' })).toBeVisible();

  await page.context().setOffline(false);
  // offline.html reloads on `online`; the app shell then flushes the queue (a manual goto here would race that reload)
  await expect.poll(() => psql(`select count(*) from attempts where user_id = '${userId}'`), { timeout: 30_000 }).toBe('3');
});
