'use client';

import { Suspense, lazy, useEffect, useRef, useState, type ComponentType } from 'react';

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
/** `onInteraction` (D-1865): the chunk loads on the first pointer, touch or focus inside the island, never in the load window. */
export function island<P extends object>(load: () => Promise<ComponentType<P>>, opts?: { eager?: boolean; onInteraction?: boolean }) {
  const ServerOnly = lazy(async () => ({ default: await load() }));
  return function Island(props: P) {
    const [Comp, setComp] = useState<ComponentType<P> | null>(null);
    const [wanted, setWanted] = useState(!opts?.onInteraction);
    const box = useRef<HTMLDivElement>(null);
    const hadFocus = useRef(false);
    useEffect(() => {
      if (!wanted) return;
      let alive = true;
      void (opts?.eager || opts?.onInteraction ? load() : afterLoadIdle().then(load)).then((C) => { if (alive) setComp(() => C); });
      return () => { alive = false; };
    }, [wanted]);
    // The server input had focus while the chunk loaded: give it back to the live one.
    useEffect(() => { if (Comp && hadFocus.current) box.current?.querySelector<HTMLElement>('input,button')?.focus(); }, [Comp]);
    const want = (focus?: boolean) => { if (focus) hadFocus.current = true; if (!wanted) setWanted(true); };
    if (typeof window === 'undefined') return <div className="contents" data-island="pending"><Suspense><ServerOnly {...props} /></Suspense></div>;
    return Comp
      ? <div ref={box} className="contents" data-island="ready"><Comp {...props} /></div>
      : <div ref={box} className="contents" data-island="pending" dangerouslySetInnerHTML={keep} suppressHydrationWarning onSubmit={opts?.eager ? (e) => e.preventDefault() : undefined}
          {...(opts?.onInteraction ? { onPointerOver: () => want(), onTouchStart: () => want(), onFocus: () => want(true) } : {})} />;
  };
}

export const FeaturesIsland = island(() => import('./sections/features-section').then((m) => m.FeaturesSection));
export const BankIsland = island(() => import('./bank/bank-section').then((m) => m.BankSection));
export const IaIsland = island(() => import('./ia/ia-section').then((m) => m.IaSection));
export const EnamedIsland = island(() => import('./enamed/enamed-section').then((m) => m.EnamedSection));
export const CalendarIsland = island(() => import('./calendar/calendar-section').then((m) => m.CalendarSection));
export const DemoIsland = island(() => import('./demo/demo-section').then((m) => m.DemoSection));
export const PlansIsland = island(() => import('./plans/plans-section').then((m) => m.PlansSectionView));
export const FaqIsland = island(() => import('./plans/faq-section').then((m) => m.FaqSection));
// eager: the form must work as soon as it is on screen (a click before the idle load used to submit the inert server form: page reload, nothing visible)
export const WaitlistIsland = island(() => import('./shell/waitlist-cta').then((m) => m.WaitlistCta), { eager: true });
// D-1865: above the fold, so its Autocomplete + popover (~30 kB) load only on interaction, not in the Lighthouse load window;
// the server-rendered input and the chips beside it are there from the first paint.
export const CoursePickerIsland = island(() => import('./hero/course-picker').then((m) => m.CoursePicker), { onInteraction: true });
