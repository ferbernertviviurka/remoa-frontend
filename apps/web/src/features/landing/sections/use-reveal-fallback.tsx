'use client';

import { useEffect, useRef } from 'react';

/**
 * Fallback of Reveal (UI JSDoc): without `animation-timeline: view()` the targets inside the parent section get
 * data-reveal="hidden" and flip to "shown" on entering the viewport. Renders an inert marker; mount once per section.
 */
export function RevealFallback() {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (CSS.supports?.('animation-timeline: view()') || typeof IntersectionObserver === 'undefined') return;
    const scope = ref.current?.parentElement;
    if (!scope) return;
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        e.target.setAttribute('data-reveal', 'shown');
        io.unobserve(e.target);
      }
    }, { rootMargin: '0px 0px -10% 0px' });
    scope.querySelectorAll('[data-reveal-target]').forEach((el) => {
      el.setAttribute('data-reveal', 'hidden');
      io.observe(el);
    });
    return () => io.disconnect();
  }, []);
  return <span ref={ref} hidden />;
}
