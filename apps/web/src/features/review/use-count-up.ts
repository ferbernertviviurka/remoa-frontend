'use client';

import { useEffect, useState } from 'react';

const reduced = () => typeof requestAnimationFrame === 'undefined' || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || document.documentElement.dataset.motion === 'reduced';
const ease = (x: number) => 1 - (1 - x) ** 3;

/** Opening animation of the numbers (FR-3/FR-8): 0 → 1 once; afterwards `n(target)` follows the target at once. Reduced motion: final value. */
export function useCountUp(ms: number): (target: number) => number {
  const [t, setT] = useState(0);
  useEffect(() => {
    if (reduced()) return setT(1);
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const x = Math.min(1, (now - start) / ms);
      setT(x);
      if (x < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [ms]);
  return (target) => Math.round(target * ease(t));
}
