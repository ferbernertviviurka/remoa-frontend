'use client';

import dynamic from 'next/dynamic';
import { EditorSkeleton } from '@/features/shell/skeletons';

/** Client-only, own chunk: React Flow and the phone map load only on /app/mapas/[id] below 768 px (FR-21). */
export const LazyMobileMap = dynamic(() => import('./mobile-map').then((m) => m.MobileMap), {
  ssr: false,
  loading: () => <EditorSkeleton />,
});
