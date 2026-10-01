'use client';

import dynamic from 'next/dynamic';
import { t } from '@remoa/strings';

/** Client-only: React Flow measures the DOM and the autosave queue replays ops from localStorage on load. */
export const LazyMapCanvas = dynamic(() => import('./map-canvas').then((m) => m.MapCanvas), {
  ssr: false,
  loading: () => <p className="text-sm text-muted">{t('common.loading')}</p>,
});
