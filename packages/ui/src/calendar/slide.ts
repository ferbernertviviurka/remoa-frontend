'use client';
import { useState } from 'react';

/** Direção da última troca de `index` ('' na primeira renderização): a grade desliza para o lado da navegação. */
export function useSlide(index: number): '' | 'next' | 'prev' {
  const [s, setS] = useState<{ index: number; dir: '' | 'next' | 'prev' }>({ index, dir: '' });
  if (s.index !== index) {
    const dir = index > s.index ? 'next' : 'prev';
    setS({ index, dir });
    return dir;
  }
  return s.dir;
}
export const slideClass = (dir: '' | 'next' | 'prev') => (dir === 'next' ? 'cal-slide-next' : dir === 'prev' ? 'cal-slide-prev' : '');
