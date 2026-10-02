import { useEffect } from 'react';

/** F13 FR-14: null = follow prefers-reduced-motion (no attribute, no cookie). The cookie lets the root layout apply it at SSR. */
export function applyMotion(reduce: boolean | null) {
  const el = document.documentElement;
  if (reduce === null) {
    delete el.dataset.motion;
    document.cookie = 'remoa-motion=; path=/; max-age=0; samesite=lax';
    return;
  }
  const v = reduce ? 'reduced' : 'full';
  el.dataset.motion = v;
  document.cookie = `remoa-motion=${v}; path=/; max-age=31536000; samesite=lax`;
}

/** Re-syncs the cookie/attribute from the account snapshot so another device's choice lands here. */
export function useMotionSync(reduce: boolean | null) {
  useEffect(() => applyMotion(reduce), [reduce]);
}
