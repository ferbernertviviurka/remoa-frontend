import { describe, expect, it } from 'vitest';
import { defaultMobileMapPrefs, MOBILE_MAP_MAX_VIEWPORTS, MOBILE_MAP_PREFS_KEY } from '@remoa/contracts';
import { readPrefs, withViewport, writePrefs } from './prefs';

const kv = (raw: string | null) => ({ getItem: () => raw, setItem: () => undefined });
const id = (i: number) => `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`;

describe('mobile map prefs (D-664)', () => {
  it('falls back to the defaults on missing, broken or invalid data and when storage throws', () => {
    expect(readPrefs(kv(null))).toEqual(defaultMobileMapPrefs);
    expect(readPrefs(kv('{oops'))).toEqual(defaultMobileMapPrefs);
    expect(readPrefs(kv(JSON.stringify({ view: 'grid' })))).toEqual(defaultMobileMapPrefs);
    expect(readPrefs({ getItem: () => { throw new Error('blocked'); }, setItem: () => undefined })).toEqual(defaultMobileMapPrefs);
    expect(readPrefs(null)).toEqual(defaultMobileMapPrefs);
  });

  it('round-trips through storage and never throws on write', () => {
    const store = new Map<string, string>();
    const s = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) };
    writePrefs({ ...defaultMobileMapPrefs, view: 'list', labels: false }, s);
    expect(store.has(MOBILE_MAP_PREFS_KEY)).toBe(true);
    expect(readPrefs(s)).toMatchObject({ view: 'list', labels: false });
    expect(() => writePrefs(defaultMobileMapPrefs, { getItem: () => null, setItem: () => { throw new Error('quota'); } })).not.toThrow();
  });

  it('keeps the 50 most recent viewports, the current map last', () => {
    let p = defaultMobileMapPrefs;
    for (let i = 0; i < MOBILE_MAP_MAX_VIEWPORTS + 5; i++) p = withViewport(p, id(i), { x: i, y: 0, zoom: 1 });
    p = withViewport(p, id(10), { x: 99, y: 0, zoom: 1.5 });
    const keys = Object.keys(p.viewports);
    expect(keys).toHaveLength(MOBILE_MAP_MAX_VIEWPORTS);
    expect(keys.at(-1)).toBe(id(10));
    expect(p.viewports[id(0)]).toBeUndefined();
    expect(p.viewports[id(10)]).toEqual({ x: 99, y: 0, zoom: 1.5 });
  });
});
