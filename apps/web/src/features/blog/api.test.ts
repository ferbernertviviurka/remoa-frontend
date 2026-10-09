import { afterEach, describe, expect, test, vi } from 'vitest';

vi.mock('@/lib/cache', () => ({ noStore: vi.fn() }));

import { noStore } from '@/lib/cache';
import { getPosts } from './api';

const realTimeout = AbortSignal.timeout.bind(AbortSignal);

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

const hang = (_url: unknown, init?: RequestInit) => new Promise((_resolve, reject) => {
  const fail = () => reject(Object.assign(new Error('timeout'), { name: 'TimeoutError' }));
  const signal = init?.signal;
  if (!signal) return;
  if (signal.aborted) fail();
  else signal.addEventListener('abort', fail, { once: true });
});

describe('blog public reads', () => {
  test('during next build, a hung API becomes an empty uncached list', async () => {
    vi.stubEnv('NEXT_PHASE', 'phase-production-build');
    vi.spyOn(AbortSignal, 'timeout').mockImplementation(() => realTimeout(20));
    vi.stubGlobal('fetch', hang);
    await expect(getPosts()).resolves.toEqual({ items: [], total: 0, page: 1, pageSize: 12 });
    expect(noStore).toHaveBeenCalledOnce();
  }, 1_000);

  test('outside the build, a hung API still throws so ISR keeps the last page', async () => {
    vi.spyOn(AbortSignal, 'timeout').mockImplementation(() => realTimeout(20));
    vi.stubGlobal('fetch', hang);
    await expect(getPosts()).rejects.toThrow(/timeout/i);
    expect(noStore).not.toHaveBeenCalled();
  }, 1_000);
});
