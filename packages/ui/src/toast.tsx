'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import * as RT from '@radix-ui/react-toast';
import { focusRing, pressable } from './button';

/**
 * Toast. Envolva o app em <ToastProvider closeLabel viewportLabel>, use `useToast().toast({title, description?, tone?})`.
 * tone = default | danger. closeLabel/viewportLabel vêm de strings (aria).
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
            className={`remoa-toast relative rounded-map border bg-surface p-4 pr-14 text-text shadow-lift ${i.tone === 'danger' ? 'border-review' : 'border-border'}`}
          >
            <RT.Title className="text-sm font-bold">{i.title}</RT.Title>
            {i.description ? <RT.Description className="mt-0.5 text-xs text-muted">{i.description}</RT.Description> : null}
            <RT.Close
              aria-label={closeLabel}
              className={`absolute right-1 top-1 flex h-11 w-11 items-center justify-center rounded-btn text-muted hover:bg-primary-tint ${pressable} ${focusRing}`}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </RT.Close>
          </RT.Root>
        ))}
        <RT.Viewport className="fixed bottom-4 right-4 z-50 flex w-[min(92vw,360px)] flex-col gap-2" />
      </RT.Provider>
    </Ctx.Provider>
  );
}

export function useToast() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useToast fora de <ToastProvider>');
  return c;
}
