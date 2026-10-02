'use client';

import { useEffect } from 'react';
import { trackWhenIdle } from '@/lib/analytics';

type Variant = '29' | '49' | null;
const clip = (v: string | null, max: number) => (v ? v.slice(0, max) : null);

/** FR-19: no personal data. UTMs clipped to the contract maxima, referrer reduced to its hostname (no path/query). */
export function landingViewedProps(search: string, referrer: string, variant: Variant, h1: 'a' | 'b' | 'c') {
  const q = new URLSearchParams(search);
  let host: string | null = null;
  try { host = referrer ? new URL(referrer).hostname : null; } catch { /* malformed referrer */ }
  return {
    variant,
    h1,
    utm_source: clip(q.get('utm_source'), 80),
    utm_medium: clip(q.get('utm_medium'), 80),
    utm_campaign: clip(q.get('utm_campaign'), 120),
    referrer: clip(host, 120),
  };
}

export const SCROLL_STEPS = [25, 50, 75, 100] as const;
export const scrollPercent = (scrollY: number, viewport: number, total: number) => (total <= viewport ? 100 : ((scrollY + viewport) / total) * 100);

export function useLandingAnalytics(variant: Variant, h1: 'a' | 'b' | 'c') {
  useEffect(() => {
    trackWhenIdle('landing_viewed', landingViewedProps(location.search, document.referrer, variant, h1));
    const sent = new Set<number>();
    let queued = false;
    const check = () => {
      queued = false;
      const el = document.documentElement;
      const pct = scrollPercent(window.scrollY, window.innerHeight, el.scrollHeight);
      for (const s of SCROLL_STEPS) if (pct >= s - 0.5 && !sent.has(s)) { sent.add(s); trackWhenIdle('scroll_depth', { depth: s }); }
      if (sent.size === SCROLL_STEPS.length) window.removeEventListener('scroll', onScroll);
    };
    const onScroll = () => { if (!queued) { queued = true; requestAnimationFrame(check); } };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [variant, h1]);
}
