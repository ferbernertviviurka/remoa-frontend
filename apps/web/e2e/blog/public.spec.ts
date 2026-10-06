// F27 T5: public blog. Runs against the real API (:4000) and does not depend on seeded posts: with posts it also walks the first card.
import { expect, test } from '@playwright/test';
import { strings } from '@remoa/strings';

const B = strings.blog.pages;

test('/blog has one h1, the search form and a canonical', async ({ page }) => {
  await page.goto('/blog');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(B.index.title);
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
  await expect(page.getByRole('search').first()).toBeVisible();
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/blog$/);
});

test('search results page is noindex', async ({ page }) => {
  await page.goto('/blog?q=zzzz-sem-resultado');
  await expect(page.locator('meta[name="robots"][content*="noindex"]').first()).toBeAttached(); // build de produção emite 2 tags (página + not-found)
  await expect(page.getByRole('status')).toContainText(B.index.noResults.title);
});

test('page 1 redirects to /blog; invalid page and unknown slug are 404 with a way back', async ({ page, request }) => {
  const r = await request.get('/blog/pagina/1', { maxRedirects: 0 });
  expect([301, 308]).toContain(r.status());
  expect(r.headers().location).toMatch(/\/blog$/);
  for (const path of ['/blog/pagina/abc', '/blog/pagina/0', '/blog/nao-existe-xyz', '/blog/categoria/nao-existe-xyz']) {
    const res = await page.goto(path);
    expect(res?.status(), path).toBe(404);
  }
  await page.goto('/blog/nao-existe-xyz');
  await expect(page.getByRole('link', { name: B.post.notFound.suggestion })).toHaveAttribute('href', '/blog');
});

test('expired preview token is 404 and noindex', async ({ page }) => {
  const res = await page.goto('/blog/preview/token-invalido');
  expect(res?.status()).toBe(404);
  await expect(page.locator('meta[name="robots"][content*="noindex"]').first()).toBeAttached(); // build de produção emite 2 tags (página + not-found)
});

test('first post, when there is one: single h1, JSON-LD and Open Graph', async ({ page }) => {
  await page.goto('/blog');
  const first = page.locator('main a[href^="/blog/"]:not([href*="/pagina/"]):not([href*="/categoria/"])').first();
  test.skip((await first.count()) === 0, 'no published post in this database');
  await first.click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
  const types = await page.locator('script[type="application/ld+json"]').evaluateAll((els) => els.map((e) => JSON.parse(e.textContent ?? '{}')['@type']));
  expect(types).toEqual(expect.arrayContaining(['BlogPosting', 'BreadcrumbList']));
  await expect(page.locator('meta[property="og:type"]')).toHaveAttribute('content', 'article');
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content', 'summary_large_image');
});
