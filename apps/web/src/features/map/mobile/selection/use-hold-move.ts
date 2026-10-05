'use client';

// F23 T6 / FR-9 (Q-085): press and hold a card 250 ms without moving > 6 px and it is selected and follows the finger (vibration
// 10 ms where there is one). A selected card already drags by React Flow's own drag (D-679); this covers the unselected one, which
// React Flow pans from. While the hold is active the touch is ours: d3-zoom must not pan, so touchmove stops at the wrapper.
import { useEffect, useRef, type RefObject } from 'react';
import type { XYPosition } from '@xyflow/react';

export const HOLD_MS = 250;
export const HOLD_SLOP = 6;
const SNAP = 8;
const snap = (v: number) => Math.round(v / SNAP) * SNAP;

/** New top-left of a held card after the finger moved (dx, dy) screen px at `zoom`; snapped to the 8 px grid. */
export const heldPosition = (start: XYPosition, dx: number, dy: number, zoom: number): XYPosition => ({ x: snap(start.x + dx / zoom), y: snap(start.y + dy / zoom) });

type Args = {
  wrap: RefObject<HTMLElement | null>;
  enabled: boolean;
  zoom: () => number;
  position: (id: string) => XYPosition | undefined;
  select: (id: string) => void;
  move: (id: string, position: XYPosition, dragging: boolean) => void;
};

export function useHoldMove(a: Args) {
  const args = useRef(a);
  args.current = a;
  useEffect(() => {
    const root = a.wrap.current;
    if (!root || !a.enabled) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let down: { id: string; x: number; y: number; pointer: number } | null = null;
    let hold: { id: string; x: number; y: number; start: XYPosition; last: XYPosition } | null = null;

    const cancel = () => {
      clearTimeout(timer);
      down = null;
    };
    const onDown = (e: PointerEvent) => {
      cancel();
      if (e.pointerType === 'mouse' || !e.isPrimary) return;
      const node = (e.target as HTMLElement).closest<HTMLElement>('.react-flow__node');
      const id = node?.dataset.id;
      if (!node || !id || node.classList.contains('selected')) return;
      down = { id, x: e.clientX, y: e.clientY, pointer: e.pointerId };
      timer = setTimeout(() => {
        const d = down;
        const start = d && args.current.position(d.id);
        if (!d || !start) return;
        hold = { id: d.id, x: d.x, y: d.y, start, last: start };
        down = null;
        navigator.vibrate?.(10);
        args.current.select(d.id);
      }, HOLD_MS);
    };
    const onMove = (e: PointerEvent) => {
      if (down && e.pointerId === down.pointer && Math.hypot(e.clientX - down.x, e.clientY - down.y) > HOLD_SLOP) cancel();
      if (!hold) return;
      hold.last = heldPosition(hold.start, e.clientX - hold.x, e.clientY - hold.y, args.current.zoom());
      args.current.move(hold.id, hold.last, true);
    };
    const onEnd = () => {
      cancel();
      if (!hold) return;
      const h = hold;
      hold = null;
      args.current.move(h.id, h.last, false);
      // the lift would also be a click on the card: swallow that one
      const swallow = (e: Event) => e.stopPropagation();
      root.addEventListener('click', swallow, { capture: true, once: true });
      setTimeout(() => root.removeEventListener('click', swallow, true), 0);
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!hold) return;
      e.stopPropagation(); // d3-zoom (the pan) listens below this element
      if (e.cancelable) e.preventDefault();
    };

    root.addEventListener('pointerdown', onDown, true);
    root.addEventListener('touchmove', onTouchMove, { capture: true, passive: false });
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onEnd);
    window.addEventListener('pointercancel', onEnd);
    return () => {
      cancel();
      root.removeEventListener('pointerdown', onDown, true);
      root.removeEventListener('touchmove', onTouchMove, true);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onEnd);
      window.removeEventListener('pointercancel', onEnd);
    };
  }, [a.wrap, a.enabled]);
}
