'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import type { BoardGraph } from '@remoa/contracts';
import { LazyMapCanvas } from './lazy-canvas';
import { LazyMobileMap } from '../mobile/canvas/lazy-mobile-map';

/** F23 (D-660): below 768 px the map is the phone canvas. The challenge still uses the editor's phone sheet layout. */
export function phoneMap(desktop: boolean, challenge: boolean) {
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
  if (phoneMap(desktop, challenge)) return <LazyMobileMap graph={graph} />;
  return <LazyMapCanvas graph={graph} />;
}

export function MapSurface({ graph }: { graph: BoardGraph }) {
  return (
    <Suspense fallback={null}>
      <Surface graph={graph} />
    </Suspense>
  );
}
