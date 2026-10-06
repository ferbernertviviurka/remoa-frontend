// G21/F29 T6 (D-979/D-980, FR-32): the web half of the cache and the only importer of `next/cache` in the app (architecture test).
// Next 15.5: unstable_cache + revalidateTag(tag). Moving to Next 16 (`use cache`, cacheTag/cacheLife, updateTag) changes only this file (Q-146).
// Global data only (landing, blog, legal, public prices, catalog): user data is cached in the API (L1), never here (D-979).
// Catalog of tags/TTLs: @remoa/contracts cache.ts. Server-only: do not import from a client component.
import { revalidatePath, revalidateTag, unstable_cache } from 'next/cache';
import { cacheTtl, type CacheTtl, type WebTag } from '@remoa/contracts';

export type GlobalWebCacheDef = {
  /** Unique and stable: the key prefix. */
  name: string;
  ttl: CacheTtl;
  /** Web tags of the catalog: the API's invalidate() forwards exactly these to POST /api/revalidate. */
  tags: [WebTag, ...WebTag[]];
  /** Extra key parts (e.g. a slug or a page number). */
  key?: (string | number)[];
};

/** CACHE_VERSION in every key (bump = drop all), CACHE_DISABLED=1 bypasses (FR-38). Read per call so tests can stub them. */
export const cacheEnv = () => ({ version: process.env.CACHE_VERSION?.trim() || '1', disabled: process.env.CACHE_DISABLED === '1' });

/** Data Cache entry for shared data, revalidated by its tags (on demand) or by its TTL profile (safety net). */
export function cachedGlobal<T>(def: GlobalWebCacheDef, fn: () => Promise<T>): Promise<T> {
  const env = cacheEnv();
  if (env.disabled) return fn();
  return unstable_cache(fn, [`v${env.version}`, def.name, ...(def.key ?? []).map(String)], { tags: def.tags, revalidate: cacheTtl[def.ttl] })();
}

/** Used by /api/revalidate (the API's invalidate(), cron, manual). Any tag string: the F27 blog tags predate the catalog. */
export function revalidateTags(tags: readonly string[]) {
  for (const t of new Set(tags)) revalidateTag(t);
}

/** Re-render a path after a Server Action (D-322 share unlock) or from /api/revalidate `paths`. */
export function revalidatePaths(paths: readonly string[]) {
  for (const p of new Set(paths)) revalidatePath(p);
}
