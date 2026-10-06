import { describe, expect, it } from 'vitest';
// @ts-expect-error plain .mjs script, no types
import { compare, parseBuild } from './check-bundle.mjs';

const OUT = `
Route (app)                              Size     First Load JS
┌ ○ /                                    5.23 kB         132 kB
├ ƒ /app/hoje                            12.1 kB         276 kB
└ ○ /termos-de-uso                       320 B           109 kB
+ First Load JS shared by all            104 kB
`;

describe('check-bundle (P-483)', () => {
  it('parses First Load JS per route and the shared size', () => {
    expect(parseBuild(OUT)).toEqual({ routes: { '/': 132, '/app/hoje': 276, '/termos-de-uso': 109 }, shared: 104 });
  });
  it('fails only above the ceiling; a route without ceiling is checked against the fallback', () => {
    const b = { routes: { '/': 138, '/app/hoje': 290 }, fallbackKb: 300 };
    expect(compare({ '/': 139, '/app/hoje': 276, '/novo': 301, '/ok': 120 }, b)).toEqual({ over: [{ route: '/', kb: 139, ceiling: 138 }, { route: '/novo', kb: 301, ceiling: 300 }], unlisted: ['/novo', '/ok'] });
  });
});
