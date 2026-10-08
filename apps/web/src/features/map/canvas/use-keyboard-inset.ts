'use client';

import { useEffect, useState } from 'react';

/**
 * Height of the on-screen keyboard in px (0 when closed or `active` is false). The keyboard shrinks the visual viewport, not
 * the layout one (iOS Safari, Chrome Android by default), so a `position: fixed; bottom: 0` bar ends up behind it.
 */
export function useKeyboardInset(active: boolean) {
  const [inset, setInset] = useState(0);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!active || !vv) return setInset(0);
    const fit = () => setInset(Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop)));
    fit();
    vv.addEventListener('resize', fit);
    vv.addEventListener('scroll', fit);
    return () => {
      vv.removeEventListener('resize', fit);
      vv.removeEventListener('scroll', fit);
    };
  }, [active]);
  return inset;
}
