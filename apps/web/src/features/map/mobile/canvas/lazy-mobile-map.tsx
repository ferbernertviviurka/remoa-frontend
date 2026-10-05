'use client';

import dynamic from 'next/dynamic';
import { EditorSkeleton } from '@/features/shell/skeletons';

const load = () => import('./mobile-map').then((m) => m.MobileMap);

// P-293 (D-706): on a phone, start fetching the chunk as soon as this module runs (page chunk evaluation), not after
// hydration + the `matchMedia` effect + render. Same promise as `dynamic` below (webpack dedupes the chunk request).
if (typeof window !== 'undefined' && window.matchMedia?.('(max-width: 767px)').matches && !window.location.search.includes('modo=desafio')) void load();

/** Client-only, own chunk: React Flow and the phone map load only on /app/mapas/[id] below 768 px (FR-21). */
export const LazyMobileMap = dynamic(load, {
  ssr: false,
  loading: () => <EditorSkeleton />,
});
