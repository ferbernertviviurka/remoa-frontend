'use client';

import { lazy, Suspense } from 'react';

const Morph = lazy(() => import('./morph').then((m) => ({ default: m.Morph })));

/**
 * Morph sob demanda (D-560): o Torph (~11 KB) só baixa quando `armed` (intenção do usuário, ex.: mão no seletor de período).
 * Antes disso, e enquanto o chunk chega, é texto simples: o HTML do servidor e o primeiro desenho não mudam.
 */
export function LazyMorph({ children, armed }: { children: string; armed: boolean }) {
  const plain = <span>{children}</span>;
  return armed ? <Suspense fallback={plain}><Morph>{children}</Morph></Suspense> : plain;
}
