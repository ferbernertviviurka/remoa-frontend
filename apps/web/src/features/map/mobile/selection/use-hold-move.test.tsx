import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { useRef } from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { heldPosition, useHoldMove } from './use-hold-move';

beforeAll(() => {
  // jsdom's PointerEvent ignores isPrimary/pointerType
  globalThis.PointerEvent = class extends MouseEvent {
    pointerType: string;
    pointerId: number;
    isPrimary: boolean;
    constructor(type: string, i: PointerEventInit = {}) {
      super(type, i);
      this.pointerType = i.pointerType ?? 'mouse';
      this.pointerId = i.pointerId ?? 1;
      this.isPrimary = i.isPrimary ?? true;
    }
  } as unknown as typeof PointerEvent;
});
afterEach(cleanup);

const fns = () => ({ select: vi.fn(), move: vi.fn() });
function Harness({ select, move, selected = false, enabled = true }: ReturnType<typeof fns> & { selected?: boolean; enabled?: boolean }) {
  const wrap = useRef<HTMLDivElement>(null);
  useHoldMove({ wrap, enabled, zoom: () => 2, position: () => ({ x: 100, y: 40 }), select, move });
  return (
    <div ref={wrap} data-testid="wrap">
      <div className={`react-flow__node${selected ? ' selected' : ''}`} data-id="a"><button>card</button></div>
    </div>
  );
}
const ptr = (el: Element | Window, type: string, x: number, y: number, pointerType = 'touch') => fireEvent(el, new PointerEvent(type, { bubbles: true, clientX: x, clientY: y, pointerType, isPrimary: true }));

describe('heldPosition', () => {
  it('moves by the screen delta over the zoom and snaps to 8 px', () => {
    expect(heldPosition({ x: 100, y: 40 }, 30, -21, 2)).toEqual({ x: 112, y: 32 });
    expect(heldPosition({ x: 100, y: 40 }, 0, 0, 1)).toEqual({ x: 104, y: 40 });
  });
});

describe('useHoldMove (FR-9, Q-085)', () => {
  it('250 ms still on an unselected card selects it, vibrates and then follows the finger until lift', () => {
    vi.useFakeTimers();
    const vibrate = vi.fn();
    Object.defineProperty(navigator, 'vibrate', { value: vibrate, configurable: true });
    const f = fns();
    const { getByRole } = render(<Harness {...f} />);
    const btn = getByRole('button');
    ptr(btn, 'pointerdown', 10, 10);
    act(() => vi.advanceTimersByTime(249));
    expect(f.select).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(f.select).toHaveBeenCalledWith('a');
    expect(vibrate).toHaveBeenCalledWith(10);
    ptr(window, 'pointermove', 50, 10);
    expect(f.move).toHaveBeenLastCalledWith('a', { x: 120, y: 40 }, true);
    ptr(window, 'pointerup', 50, 10);
    expect(f.move).toHaveBeenLastCalledWith('a', { x: 120, y: 40 }, false);
    vi.useRealTimers();
  });

  it('moving more than 6 px before 250 ms is a pan, not a hold', () => {
    vi.useFakeTimers();
    const f = fns();
    const { getByRole } = render(<Harness {...f} />);
    ptr(getByRole('button'), 'pointerdown', 10, 10);
    ptr(window, 'pointermove', 10, 18);
    act(() => vi.advanceTimersByTime(400));
    expect(f.select).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('ignores a selected card (React Flow drags it), the mouse and a disabled hook', () => {
    vi.useFakeTimers();
    for (const [props, type] of [[{ selected: true }, 'touch'], [{}, 'mouse'], [{ enabled: false }, 'touch']] as const) {
      const f = fns();
      const { getByRole, unmount } = render(<Harness {...f} {...props} />);
      ptr(getByRole('button'), 'pointerdown', 10, 10, type);
      act(() => vi.advanceTimersByTime(400));
      expect(f.select).not.toHaveBeenCalled();
      unmount();
    }
    vi.useRealTimers();
  });

  it('while held, touchmove is stopped so the map does not pan', () => {
    vi.useFakeTimers();
    const f = fns();
    const { getByRole, getByTestId } = render(<Harness {...f} />);
    ptr(getByRole('button'), 'pointerdown', 10, 10);
    act(() => vi.advanceTimersByTime(250));
    const ev = new Event('touchmove', { bubbles: true, cancelable: true });
    const inner = vi.fn();
    getByRole('button').addEventListener('touchmove', inner);
    getByTestId('wrap').dispatchEvent(new Event('touchmove', { cancelable: true }));
    getByRole('button').dispatchEvent(ev);
    expect(ev.defaultPrevented).toBe(true);
    expect(inner).not.toHaveBeenCalled();
    vi.useRealTimers();
  });
});
