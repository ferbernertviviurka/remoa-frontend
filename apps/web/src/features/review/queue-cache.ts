import type { z } from 'zod';
import type { savedSchema } from './queue-cache-schema';

const KEY = '/revisar/fila.json';
const LEGACY = '/revisar/fila';
const CACHE = 'remoa-queue';

export type SavedQueue = z.infer<typeof savedSchema>;

/** Last review queue, stored where the service worker can read it offline (F09 FR-5). */
export async function rememberQueue(saved: SavedQueue): Promise<void> {
  try {
    if (typeof caches === 'undefined') return;
    const cache = await caches.open(CACHE);
    await cache.put(KEY, new Response(JSON.stringify(saved), { headers: { 'content-type': 'application/json' } }));
  } catch {
    /* private mode or a cache the browser will not open */
  }
}

async function readSaved(cache: Cache, key: string): Promise<SavedQueue | null> {
  const hit = await cache.match(key);
  if (!hit) return null;
  const body: unknown = await hit.json();
  const { savedSchema, legacySchema } = await import('./queue-cache-schema');
  const saved = savedSchema.safeParse(body);
  if (saved.success) return saved.data;
  const legacy = legacySchema.safeParse(body);
  return legacy.success ? { items: legacy.data, boardTitles: {} } : null;
}

/** The queue from the last successful load. Null when nothing valid is stored. */
export async function recallQueue(): Promise<SavedQueue | null> {
  try {
    if (typeof caches === 'undefined') return null;
    const cache = await caches.open(CACHE);
    return (await readSaved(cache, KEY)) ?? (await readSaved(cache, LEGACY));
  } catch {
    return null;
  }
}
