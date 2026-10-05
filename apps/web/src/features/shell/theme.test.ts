import { describe, expect, it } from 'vitest';
import { themeScript } from './theme';

describe('themeScript (D-534)', () => {
  it('applies the remoa-motion cookie before paint, ignoring other values', () => {
    const el = document.documentElement;
    document.cookie = 'remoa-motion=reduced; path=/';
    new Function(themeScript)();
    expect(el.dataset.motion).toBe('reduced');
    delete el.dataset.motion;
    document.cookie = 'remoa-motion=weird; path=/';
    new Function(themeScript)();
    expect(el.dataset.motion).toBeUndefined();
    document.cookie = 'remoa-motion=; path=/; max-age=0';
  });
});
