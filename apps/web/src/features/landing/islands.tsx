'use client';

import { Suspense, lazy, useEffect, useState, type ComponentType } from 'react';

/** Resolves at the first idle moment after the load event: island chunks never compete with the first paint (LCP). */
export function afterLoadIdle() {
  return new Promise<void>((resolve) => {
    const idle = () => (typeof requestIdleCallback === 'function' ? requestIdleCallback(() => resolve(), { timeout: 1500 }) : setTimeout(resolve, 50));
    if (document.readyState === 'complete') idle();
    else window.addEventListener('load', idle, { once: true });
  });
}

// Empty innerHTML + suppressHydrationWarning: React leaves the server DOM inside alone, through hydration and re-renders.
const keep = { __html: '' };

/**
 * D-535: below-the-fold client island. The server renders it in full (static HTML, SEO, no layout shift). In the browser the
 * server DOM is kept as is and the island's chunk is fetched after the page has loaded; then the component renders over it
 * with the same markup (`data-island="ready"`, which e2e waits for). Not a React dehydrated Suspense boundary on purpose:
 * App Router re-renders made React drop those and show the (empty) fallback.
 * Don't use it above the fold: the re-rendered nodes would be a late LCP candidate (see hero-stage, D-356).
 */
export function island<P extends object>(load: () => Promise<ComponentType<P>>) {
  const ServerOnly = lazy(async () => ({ default: await load() }));
  return function Island(props: P) {
    const [Comp, setComp] = useState<ComponentType<P> | null>(null);
    useEffect(() => {
      let alive = true;
      void afterLoadIdle().then(load).then((C) => { if (alive) setComp(() => C); });
      return () => { alive = false; };
    }, []);
    if (typeof window === 'undefined') return <div className="contents" data-island="pending"><Suspense><ServerOnly {...props} /></Suspense></div>;
    return Comp
      ? <div className="contents" data-island="ready"><Comp {...props} /></div>
      : <div className="contents" data-island="pending" dangerouslySetInnerHTML={keep} suppressHydrationWarning />;
  };
}

export const FeaturesIsland = island(() => import('./sections/features-section').then((m) => m.FeaturesSection));
export const DemoIsland = island(() => import('./demo/demo-section').then((m) => m.DemoSection));
export const PlansIsland = island(() => import('./plans/plans-section').then((m) => m.PlansSectionView));
export const FaqIsland = island(() => import('./plans/faq-section').then((m) => m.FaqSection));
export const WaitlistIsland = island(() => import('./shell/waitlist-cta').then((m) => m.WaitlistCta));
