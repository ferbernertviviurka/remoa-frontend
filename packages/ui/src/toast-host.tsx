'use client';

import { useEffect } from 'react';
import * as RT from '@radix-ui/react-toast';
import { focusRing, pressable } from './button-styles';
import { Icon } from './icons';
import type { ToastInput } from './toast';

/** Parte Radix do Toast, carregada sob demanda no primeiro toast (D-558): fora do bundle das rotas que nunca avisam. */
export type ToastItem = ToastInput & { id: number };

export default function ToastHost({ items, onClose, closeLabel, viewportLabel, onReady }: { onReady?: () => void; items: ToastItem[]; onClose: (id: number) => void; closeLabel: string; viewportLabel: string }) {
  useEffect(() => { onReady?.(); }, [onReady]);
  return (
    <RT.Provider label={viewportLabel}>
      {items.map((i) => (
        <RT.Root
          key={i.id}
          onOpenChange={(o) => { if (!o) onClose(i.id); }}
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
  );
}
