'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import type { BoardGraph } from '@remoa/contracts';
import { LazyMapCanvas } from './lazy-canvas';
import { MobileCardList } from '../mobile-list';

/** Phone map is a list. The challenge still uses the canvas sheet, which already lays out for a phone. */
export function mobileListInsteadOfCanvas(desktop: boolean, challenge: boolean) {
  return !desktop && !challenge;
}

function Surface({ graph }: { graph: BoardGraph }) {
  const challenge = useSearchParams().get('modo') === 'desafio';
  const [desktop, setDesktop] = useState<boolean | null>(null);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const apply = () => setDesktop(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);
  if (desktop === null) return null;
  if (mobileListInsteadOfCanvas(desktop, challenge)) return <MobileCardList graph={graph} />;
  return <LazyMapCanvas graph={graph} />;
}

export function MapSurface({ graph }: { graph: BoardGraph }) {
  return (
    <Suspense fallback={null}>
      <Surface graph={graph} />
    </Suspense>
  );
}
