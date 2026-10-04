import { afterEach, describe, expect, it } from 'vitest';
import { reviewQueueFixture } from '@remoa/contracts/mocks';
import { recallQueue, rememberQueue } from './queue-cache';

afterEach(() => {
  Reflect.deleteProperty(globalThis, 'caches');
});

describe('rememberQueue', () => {
  it('stores the queue where the service worker reads it', async () => {
    const store = cacheStore();
    await rememberQueue({ items: reviewQueueFixture, boardTitles: { [reviewQueueFixture[0]!.boardId]: 'Sepse' } });
    expect(store.saved?.items).toEqual(reviewQueueFixture);
    expect(store.saved?.boardTitles[reviewQueueFixture[0]!.boardId]).toBe('Sepse');
  });

  it('reads the last queue back, including a list saved before titles were stored', async () => {
    const store = cacheStore();
    await rememberQueue({ items: reviewQueueFixture, boardTitles: { b: 'Sepse' } });
    await expect(recallQueue()).resolves.toEqual({ items: reviewQueueFixture, boardTitles: { b: 'Sepse' } });

    store.putRaw(reviewQueueFixture);
    await expect(recallQueue()).resolves.toEqual({ items: reviewQueueFixture, boardTitles: {} });

    store.putRaw({ items: [{ cardId: 'nope' }] });
    await expect(recallQueue()).resolves.toBeNull();
  });
});

function cacheStore() {
  const bodies = new Map<string, unknown>();
  const put = async (request: string, response: Response) => {
    bodies.set(request, await response.json());
  };
  globalThis.caches = {
    open: async () => ({
      put,
      match: async (key: string) => {
        const body = bodies.get(key);
        return body === undefined ? undefined : new Response(JSON.stringify(body));
      },
    }),
  } as unknown as CacheStorage;
  return {
    get saved() {
      return bodies.get('/revisar/fila.json') as { items: unknown; boardTitles: Record<string, string> } | undefined;
    },
    putRaw(value: unknown) {
      bodies.delete('/revisar/fila.json');
      bodies.set('/revisar/fila', value);
    },
  };
}
