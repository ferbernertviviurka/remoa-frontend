import { afterEach, describe, expect, test, vi } from 'vitest';

vi.mock('@/lib/cache', () => ({ noStore: vi.fn() }));

import { noStore } from '@/lib/cache';
import { loadPublicSeeds } from './public-api';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe('loadPublicSeeds', () => {
  test('returns the API list', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ data: [{ slug: 'sepse' }] }) })));
    await expect(loadPublicSeeds()).resolves.toEqual([{ slug: 'sepse' }]);
    expect(noStore).not.toHaveBeenCalled();
  });

  test('during next build, a hung API becomes an empty uncached list', async () => {
    vi.stubEnv('NEXT_PHASE', 'phase-production-build');
    const realTimeout = AbortSignal.timeout.bind(AbortSignal);
    vi.spyOn(AbortSignal, 'timeout').mockImplementation(() => realTimeout(20));
    vi.stubGlobal('fetch', (_url: unknown, init?: RequestInit) => new Promise((_resolve, reject) => {
      const fail = () => reject(new Error('timeout'));
      const signal = init?.signal;
      if (!signal) return;
      if (signal.aborted) fail();
      else signal.addEventListener('abort', fail, { once: true });
    }));
    await expect(loadPublicSeeds()).resolves.toEqual([]);
    expect(noStore).toHaveBeenCalledOnce();
  }, 1_000);

  test('during next build, an API failure becomes an empty uncached list', async () => {
    vi.stubEnv('NEXT_PHASE', 'phase-production-build');
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('ECONNREFUSED'); }));
    await expect(loadPublicSeeds()).resolves.toEqual([]);
    expect(noStore).toHaveBeenCalledOnce();
  });

  test('outside the build, an API failure still throws so ISR keeps the last page', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 503, json: async () => ({}) })));
    await expect(loadPublicSeeds()).rejects.toThrow('mapas-prontos: API 503');
    expect(noStore).not.toHaveBeenCalled();
  });
});
