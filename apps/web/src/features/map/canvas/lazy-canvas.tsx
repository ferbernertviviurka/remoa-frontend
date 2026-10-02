'use client';

import dynamic from 'next/dynamic';
import { EditorSkeleton } from '@/features/shell/skeletons';

/**
 * Client-only: React Flow measures the DOM and the autosave queue replays ops from localStorage on load.
 * G02: while the chunk loads, the same skeleton as the route's `loading.tsx` (it used to be a bare "Carregando…" line,
 * so the page went blank between the two).
 */
export const LazyMapCanvas = dynamic(() => import('./map-canvas').then((m) => m.MapCanvas), {
  ssr: false,
  loading: () => <EditorSkeleton />,
});
