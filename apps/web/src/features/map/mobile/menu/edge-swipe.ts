import { useEffect } from 'react';

const EDGE = 20; // px from the left edge where the gesture may start
const OPEN_DX = 56;

/** Android only (Q-088/D-667): on iOS the left-edge swipe is the system "back". Touch starts at the edge and moves right = open. */
export const isAndroid = () => typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent);

export function useEdgeSwipe(onOpen: () => void, enabled: boolean) {
  useEffect(() => {
    if (!enabled || !isAndroid()) return;
    let from: { x: number; y: number } | null = null;
    const down = (e: TouchEvent) => {
      const p = e.touches[0];
      from = p && p.clientX <= EDGE ? { x: p.clientX, y: p.clientY } : null;
    };
    const move = (e: TouchEvent) => {
      const p = e.touches[0];
      if (!from || !p) return;
      const dx = p.clientX - from.x;
      if (dx > OPEN_DX && dx > Math.abs(p.clientY - from.y)) {
        from = null;
        onOpen();
      }
    };
    const end = () => (from = null);
    // capture: d3-zoom (React Flow's pan) stops propagation of touches that start on the pane
    const o = { passive: true, capture: true } as const;
    window.addEventListener('touchstart', down, o);
    window.addEventListener('touchmove', move, o);
    window.addEventListener('touchend', end, o);
    window.addEventListener('touchcancel', end, o);
    return () => {
      window.removeEventListener('touchstart', down, o);
      window.removeEventListener('touchmove', move, o);
      window.removeEventListener('touchend', end, o);
      window.removeEventListener('touchcancel', end, o);
    };
  }, [onOpen, enabled]);
}
