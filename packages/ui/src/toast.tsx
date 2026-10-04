'use client';

import { createContext, lazy, Suspense, useCallback, useRef, useContext, useMemo, useState, type ReactNode } from 'react';

const ToastHost = lazy(() => import('./toast-host'));

/**
 * Toast. Envolva o app em <ToastProvider closeLabel viewportLabel>, use `useToast().toast({title, description?, tone?})`.
 * Visual v2: balão escuro (--ink), 14 px/600, raio 16, sombra de aviso, botão de fechar 36 px; tone = default | danger (danger acrescenta um anel --review-on-dark). closeLabel/viewportLabel vêm de strings (aria).
 */
export type ToastInput = { title: string; description?: string; tone?: 'default' | 'danger' };
type Item = ToastInput & { id: number };
const Ctx = createContext<{ toast: (t: ToastInput) => void } | null>(null);

export function ToastProvider({ children, closeLabel, viewportLabel }: { children: ReactNode; closeLabel: string; viewportLabel: string }) {
  const [items, setItems] = useState<Item[]>([]);
  const toast = useCallback((t: ToastInput) => { if (!hostReady.current) setSaid(`${[t.title, t.description].filter(Boolean).join('. ')}.`); setItems((l) => [...l, { ...t, id: Date.now() + l.length }]); }, []);
  const close = useCallback((id: number) => setItems((l) => l.filter((x) => x.id !== id)), []);
  // Região viva mínima, sempre montada (D-560): o host Radix só monta com o 1º toast e os leitores perdiam esse anúncio.
  // Depois que o host existe, ele anuncia sozinho e a região para (sem fala dobrada).
  const [said, setSaid] = useState('');
  const hostReady = useRef(false);
  const value = useMemo(() => ({ toast }), [toast]);
  return (
    <Ctx.Provider value={value}>
      {children}
      <div aria-live="polite" className="sr-only">{said}</div>
      {items.length > 0 ? (
        <Suspense fallback={null}>
          <ToastHost onReady={() => { hostReady.current = true; }} items={items} onClose={close} closeLabel={closeLabel} viewportLabel={viewportLabel} />
        </Suspense>
      ) : null}
    </Ctx.Provider>
  );
}

export function useToast() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useToast fora de <ToastProvider>');
  return c;
}
