import { beforeEach, describe, expect, it, vi } from 'vitest';

const { preload, manifest } = vi.hoisted(() => ({
  preload: vi.fn(),
  manifest: () =>
    JSON.stringify({
      'features/map/canvas/lazy-canvas.tsx -> ./map-canvas': { files: ['static/chunks/desk.js'] },
      'features/map/mobile/canvas/lazy-mobile-map.tsx -> ./mobile-map': { files: ['static/css/m.css', 'static/chunks/m.js'] },
    }),
}));
vi.mock('react-dom', () => ({ preload }));
vi.mock('node:fs', () => ({ readFileSync: manifest, default: { readFileSync: manifest } }));

import { isPhoneUA, phoneMapFiles, preloadPhoneMap, resetPhoneMapFiles } from './preload-phone-map';

const PIXEL = 'Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36';
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148';
const MAC = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 Chrome/120 Safari/537.36';

beforeEach(() => {
  preload.mockClear();
  resetPhoneMapFiles();
});

describe('preloadPhoneMap (P-293)', () => {
  it('phone user agents only', () => {
    expect([PIXEL, IPHONE, MAC, null].map(isPhoneUA)).toEqual([true, true, false, false]);
  });
  it('a phone gets the phone-map chunk as low-priority preloads (css as style); a desktop gets nothing', () => {
    preloadPhoneMap(MAC);
    expect(preload).not.toHaveBeenCalled();
    preloadPhoneMap(PIXEL);
    expect(preload.mock.calls).toEqual([
      ['/_next/static/css/m.css', { as: 'style', fetchPriority: 'low' }],
      ['/_next/static/chunks/m.js', { as: 'script', fetchPriority: 'low' }],
    ]);
  });
  it('no manifest (dev without build, tests): nothing to preload, no throw', () => {
    expect(phoneMapFiles(() => { throw new Error('ENOENT'); })).toBeNull();
    preloadPhoneMap(PIXEL);
    expect(preload).not.toHaveBeenCalled();
  });
});
