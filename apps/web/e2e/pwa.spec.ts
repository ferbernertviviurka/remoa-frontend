// F09 FR-5: manifest, service worker, and the start URL answering 200 while offline.
import { expect, test } from '@playwright/test';

test('o app abre a revisão sem rede a partir do manifesto', async ({ page }) => {
  const manifest = await page.request.get('/manifest.webmanifest');
  expect(manifest.ok()).toBe(true);
  const body = await manifest.json();
  expect(body).toMatchObject({
    name: 'Remoa',
    short_name: 'Remoa',
    start_url: '/revisar',
    display: 'standalone',
    theme_color: '#6D5BD0',
    background_color: '#f6f5fb',
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
      const cache = await caches.open('remoa-shell-v5');
      const hit = await cache.match('/revisar');
      if (hit && hit.ok) return;
      await new Promise((r) => setTimeout(r, 100));
    }
    throw new Error('start url was not precached');
  });

  await page.context().setOffline(true);
  const offline = await page.goto('/revisar');
  expect(offline?.status()).toBe(200);
  expect(offline?.url()).toContain('/revisar');
  await expect(page.getByRole('heading', { name: 'Sem conexão' })).toBeVisible();
});
