// F15 e2e helpers: cookie login (accountUser, 1 GoTrue call), Free with N maps, and a mock-Stripe subscription driven through the API (STRIPE=mock).
import { expect, type APIRequestContext, type Page } from '@playwright/test';
import { accountUser, API } from '../account/fixture';

type Headers = { authorization: string };

export const planUser = (page: Page, request: APIRequestContext) => accountUser(page, request, 'Marina Alves');

export async function makeBoards(request: APIRequestContext, headers: Headers, n: number) {
  for (let i = 0; i < n; i++) {
    const r = await request.post(`${API}/v1/boards`, { headers, data: { title: `Mapa ${i + 1}` } });
    expect(r.status()).toBe(201);
  }
}

/** Creates the mock checkout session; returns the mock URL (the one the browser is redirected to). */
export async function createSession(request: APIRequestContext, headers: Headers, body: { period: 'monthly' | 'annual'; method: 'pix' | 'card'; couponCode?: string }) {
  const r = await request.post(`${API}/v1/billing/checkout`, { headers, data: body });
  expect(r.status()).toBe(200);
  const url = (await r.json()).data.url as string;
  return { url, session: new URL(url).searchParams.get('session') as string };
}

/** Pro through the mock: opens and completes a checkout without a browser (the 302 is the success_url). */
export async function subscribe(request: APIRequestContext, headers: Headers, period: 'monthly' | 'annual' = 'monthly', method: 'pix' | 'card' = 'card') {
  const { url } = await createSession(request, headers, { period, method });
  const r = await request.get(url, { maxRedirects: 0 });
  expect(r.status()).toBe(302);
}

export const events = (page: Page) => page.evaluate(() => window.__remoaEvents ?? []);
