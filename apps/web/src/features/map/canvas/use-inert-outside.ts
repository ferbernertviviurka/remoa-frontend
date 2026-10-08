'use client';

import { useEffect, type RefObject } from 'react';

export const KEEP_ATTR = 'data-inert-keep';

/**
 * While `active`, everything on the page outside `ref` (and outside `[data-inert-keep]`) is `inert`, like a modal: Tab and
 * VoiceOver stay in the layer. Live regions (toasts, save status, route announcer) stay out of it so they are still read.
 * Restores only what it set.
 */
export function useInertOutside(ref: RefObject<HTMLElement | null>, active: boolean) {
  useEffect(() => {
    const layer = ref.current;
    if (!active || !layer) return;
    const set: Element[] = [];
    const mark = (el: Element) => {
      if (el.hasAttribute('inert') || el.hasAttribute(KEEP_ATTR) || /^(SCRIPT|STYLE|LINK|TEMPLATE|NEXT-ROUTE-ANNOUNCER)$/.test(el.tagName) || el.matches('[aria-live]')) return;
      if (el.querySelector('[aria-live]')) return Array.from(el.children).forEach(mark);
      el.setAttribute('inert', '');
      set.push(el);
    };
    for (let el: Element = layer; el.parentElement && el !== document.body; el = el.parentElement) {
      for (const sib of Array.from(el.parentElement.children)) if (sib !== el) mark(sib);
    }
    return () => set.forEach((el) => el.removeAttribute('inert'));
  }, [ref, active]);
}
