// G21/F29 T6: the web half. (a) architecture: no `next/cache` outside src/lib/cache/; cachedGlobal keys, tags, TTL, bypass.
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

type UnstableCache = (fn: () => Promise<unknown>, key: string[], opts: { tags: string[]; revalidate: number }) => () => Promise<unknown>;
const unstable_cache = vi.fn<UnstableCache>((fn) => fn);
const revalidateTag = vi.fn();
const revalidatePath = vi.fn();
vi.mock('next/cache', () => ({ unstable_cache: (...a: Parameters<typeof unstable_cache>) => unstable_cache(...a), revalidateTag: (t: string) => revalidateTag(t), revalidatePath: (p: string) => revalidatePath(p) }));
const { cachedGlobal, revalidatePaths, revalidateTags } = await import('.');

const SRC = join(import.meta.dirname, '..', '..');
const walk = (d: string, out: string[] = []): string[] => {
  for (const e of readdirSync(d, { withFileTypes: true })) {
    const p = join(d, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.tsx?$/.test(e.name)) out.push(p);
  }
  return out;
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe('web cache architecture (FR-32)', () => {
  it('(a) only src/lib/cache/ imports next/cache', () => {
    const bad = walk(SRC)
      .map((p) => relative(SRC, p).split(sep).join('/'))
      .filter((p) => !p.startsWith('lib/cache/') && /from ['"]next\/cache['"]|require\(['"]next\/cache['"]\)|import\(['"]next\/cache['"]\)/.test(readFileSync(join(SRC, p), 'utf8')));
    expect(bad).toEqual([]);
  });
});

describe('cachedGlobal', () => {
  it('keys by CACHE_VERSION + name + parts, with the catalog tags and the TTL profile', async () => {
    expect(await cachedGlobal({ name: 'blog-post', ttl: 'day', tags: ['blog', 'blog:post:x'], key: ['x', 2] }, async () => 'v')).toBe('v');
    expect(unstable_cache).toHaveBeenCalledWith(expect.any(Function), ['v1', 'blog-post', 'x', '2'], { tags: ['blog', 'blog:post:x'], revalidate: 86_400 });
    vi.stubEnv('CACHE_VERSION', '7');
    await cachedGlobal({ name: 'legal', ttl: 'long', tags: ['legal:terms'] }, async () => 'v');
    expect(unstable_cache.mock.calls[1]?.[1]).toEqual(['v7', 'legal']);
  });

  it('CACHE_DISABLED=1 runs fn directly, same answer', async () => {
    vi.stubEnv('CACHE_DISABLED', '1');
    expect(await cachedGlobal({ name: 'x', ttl: 'short', tags: ['landing'] }, async () => 42)).toBe(42);
    expect(unstable_cache).not.toHaveBeenCalled();
  });

  it('revalidateTags / revalidatePaths de-duplicate', () => {
    revalidateTags(['blog', 'blog', 'feed']);
    revalidatePaths(['/m/a', '/m/a']);
    expect(revalidateTag.mock.calls.map((c) => c[0])).toEqual(['blog', 'feed']);
    expect(revalidatePath).toHaveBeenCalledTimes(1);
  });

  it('types: user tags and raw TTLs are refused', () => {
    // @ts-expect-error user data never goes to the web Data Cache (D-979)
    const user = () => cachedGlobal({ name: 'x', ttl: 'short', tags: ['user:a:stats'] }, async () => 1);
    // @ts-expect-error ttl is a named profile
    const raw = () => cachedGlobal({ name: 'x', ttl: 60, tags: ['landing'] }, async () => 1);
    expect([user, raw].length).toBe(2);
  });
});
