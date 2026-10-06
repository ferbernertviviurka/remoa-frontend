'use client';

import dynamic from 'next/dynamic';
import { SkeletonBlock } from '@remoa/ui';

/** G21 FR-48: TipTap/ProseMirror (cerca de 100 KB gzip) só baixa na página do editor, e fora do JS inicial dela. */
export const LazyPostEditor = dynamic(() => import('./post-editor').then((m) => m.PostEditor), {
  ssr: false,
  loading: () => <SkeletonBlock height={560} radius={18} />,
});
