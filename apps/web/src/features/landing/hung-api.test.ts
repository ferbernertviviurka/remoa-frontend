import { afterEach, describe, expect, it, vi } from 'vitest';

const noStore = vi.hoisted(() => vi.fn());
vi.mock('@/lib/cache', () => ({ noStore }));

import { loadPublicPriceBook } from './shell/pricebook';
import { getLatestPosts } from './blog/latest-posts';

// `next build` gives each static page 60 s; a fetch that never answers used to take `/` down with it.
describe('landing fetches when the API never answers', () => {
  const realTimeout = AbortSignal.timeout.bind(AbortSignal);
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    noStore.mockClear();
  });

  const hang = () => {
    vi.spyOn(AbortSignal, 'timeout').mockImplementation(() => realTimeout(20));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal('fetch', (_url: unknown, init?: RequestInit) => new Promise((_resolve, reject) => {
      const signal = init?.signal;
      if (!signal) return;
      const fail = () => reject(Object.assign(new Error('The operation was aborted due to timeout'), { name: 'TimeoutError' }));
      if (signal.aborted) fail();
      else signal.addEventListener('abort', fail, { once: true });
    }));
  };

  it('prices: gives up and renders the "unavailable" plans, uncached', async () => {
    hang();
    await expect(loadPublicPriceBook(null)).resolves.toBeNull();
    expect(noStore).toHaveBeenCalledOnce();
  }, 1_000);

  it('latest posts: gives up and hides the section, uncached', async () => {
    hang();
    await expect(getLatestPosts(3)).resolves.toEqual([]);
    expect(noStore).toHaveBeenCalledOnce();
  }, 1_000);
});
