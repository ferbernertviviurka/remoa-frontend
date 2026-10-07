'use client';

import { useEffect, useRef } from 'react';

/** Pauses every `.k` under `root` while that block is off screen, and reports one view after `player` stays half visible for 3s. */
export function useDemoPlayer(onViewed: () => void) {
  const root = useRef<HTMLDivElement>(null);
  const player = useRef<HTMLDivElement>(null);
  const onViewedRef = useRef(onViewed);
  onViewedRef.current = onViewed;
  useEffect(() => {
    if (typeof IntersectionObserver !== 'function') return;
    const box = root.current;
    const stage = player.current;
    let timer = 0;
    let fired = false;
    const pause = box
      ? new IntersectionObserver(([entry]) => { box.classList.toggle('is-paused', !entry?.isIntersecting); }, { threshold: 0.15 })
      : null;
    const view = stage
      ? new IntersectionObserver(([entry]) => {
        window.clearTimeout(timer);
        if (!entry?.isIntersecting || fired) return;
        timer = window.setTimeout(() => {
          if (fired) return;
          fired = true;
          onViewedRef.current();
        }, 3000);
      }, { threshold: 0.5 })
      : null;
    if (box && pause) pause.observe(box);
    if (stage && view) view.observe(stage);
    return () => { window.clearTimeout(timer); pause?.disconnect(); view?.disconnect(); };
  }, []);
  return { root, player };
}
