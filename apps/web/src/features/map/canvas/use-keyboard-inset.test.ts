import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useKeyboardInset } from './use-keyboard-inset';

function fakeViewport(height: number, offsetTop = 0) {
  const target = new EventTarget();
  const vv = Object.assign(target, { height, offsetTop });
  vi.stubGlobal('visualViewport', vv);
  return vv;
}

afterEach(() => vi.unstubAllGlobals());

describe('useKeyboardInset (D-1573)', () => {
  it('is the layout height minus the visual viewport, following resize and scroll', () => {
    vi.stubGlobal('innerHeight', 844);
    const vv = fakeViewport(844);
    const { result } = renderHook(() => useKeyboardInset(true));
    expect(result.current).toBe(0);
    act(() => {
      vv.height = 480;
      vv.dispatchEvent(new Event('resize'));
    });
    expect(result.current).toBe(364);
    act(() => {
      vv.offsetTop = 100;
      vv.dispatchEvent(new Event('scroll'));
    });
    expect(result.current).toBe(264);
  });

  it('inactive (desktop, explore mode) is always 0', () => {
    vi.stubGlobal('innerHeight', 844);
    fakeViewport(480);
    expect(renderHook(() => useKeyboardInset(false)).result.current).toBe(0);
  });

  it('no visualViewport = 0', () => {
    vi.stubGlobal('visualViewport', undefined);
    expect(renderHook(() => useKeyboardInset(true)).result.current).toBe(0);
  });
});
