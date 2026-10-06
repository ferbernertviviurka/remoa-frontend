'use client';

import dynamic from 'next/dynamic';
import { SkeletonBlock } from '@remoa/ui';

/** G21 FR-48: Swiper (27 KB gzip) fora do JS inicial de Hoje; o esqueleto ocupa a mesma altura da faixa. */
export const LazyMapSlider = dynamic(() => import('./map-slider').then((m) => m.MapSlider), {
  ssr: false,
  loading: () => <SkeletonBlock height={312} radius={26} />,
});
