import { expect, it } from 'vitest';
import { safeNext } from './safe-next';

it('keeps same-origin paths, rejects escapes', () => {
  expect(safeNext('/mapas?x=1')).toBe('/mapas?x=1');
  for (const bad of [undefined, null, '', 'https://evil.com', '//evil.com', '/\\evil.com', '/\t/evil.com', '/\n/evil.com', '\\\\evil.com']) {
    expect(safeNext(bad)).toBe('/mapas');
  }
});
