'use client';

import { useEffect, useState } from 'react';

/** Movimento reduzido: `<html data-motion="reduced">` (F13) ou, sem `data-motion="full"`, `prefers-reduced-motion` do sistema. */
export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const el = document.documentElement;
    const read = () => {
      const m = el.dataset.motion;
      setReduced(m === 'reduced' || (m !== 'full' && window.matchMedia('(prefers-reduced-motion: reduce)').matches));
    };
    read();
    const mo = new MutationObserver(read);
    mo.observe(el, { attributes: true, attributeFilter: ['data-motion'] });
    return () => mo.disconnect();
  }, []);
  return reduced;
}
