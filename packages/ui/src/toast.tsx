'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import * as RT from '@radix-ui/react-toast';
import { focusRing, pressable } from './button';
import { Icon } from './icons';

/**
 * Toast. Envolva o app em <ToastProvider closeLabel viewportLabel>, use `useToast().toast({title, description?, tone?})`.
 * Visual v2: balão escuro (--ink), 14 px/600, raio 16, sombra de aviso, botão de fechar 36 px; tone = default | danger (danger acrescenta um anel --review-on-dark). closeLabel/viewportLabel vêm de strings (aria).
 */
export type ToastInput = { title: string; description?: string; tone?: 'default' | 'danger' };
type Item = ToastInput & { id: number };
const Ctx = createContext<{ toast: (t: ToastInput) => void } | null>(null);

export function ToastProvider({ children, closeLabel, viewportLabel }: { children: ReactNode; closeLabel: string; viewportLabel: string }) {
  const [items, setItems] = useState<Item[]>([]);
  const toast = useCallback((t: ToastInput) => setItems((l) => [...l, { ...t, id: Date.now() + l.length }]), []);
  const value = useMemo(() => ({ toast }), [toast]);
  return (
    <Ctx.Provider value={value}>
      <RT.Provider label={viewportLabel}>
        {children}
        {items.map((i) => (
          <RT.Root
            key={i.id}
            onOpenChange={(o) => { if (!o) setItems((l) => l.filter((x) => x.id !== i.id)); }}
            className={`remoa-toast relative flex items-center gap-3 rounded-[16px] bg-ink py-3 pl-[18px] pr-3 text-[14px] font-semibold text-surface shadow-toast ${i.tone === 'danger' ? 'ring-2 ring-review-on-dark' : ''}`}
          >
            <div className="min-w-0 flex-1">
              <RT.Title>{i.title}</RT.Title>
              {i.description ? <RT.Description className="mt-0.5 text-xs font-normal opacity-80">{i.description}</RT.Description> : null}
            </div>
            <RT.Close
              aria-label={closeLabel}
              className={`flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-white/10 text-surface hover:bg-white/20 ${pressable} ${focusRing}`}
            >
              <Icon name="close" size={16} />
            </RT.Close>
          </RT.Root>
        ))}
        <RT.Viewport className="fixed bottom-4 right-4 z-50 flex w-[min(92vw,360px)] max-w-[360px] flex-col gap-2" />
      </RT.Provider>
    </Ctx.Provider>
  );
}

export function useToast() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useToast fora de <ToastProvider>');
  return c;
}
