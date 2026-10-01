'use client';

import type { ReactNode } from 'react';
import * as RD from '@radix-ui/react-dialog';
import { focusRing, pressable } from './button';

/**
 * Dialog modal. Controlado (open/onOpenChange) ou com `trigger` (elemento que abre).
 * `title` obrigatório; `description` opcional; `closeLabel` = aria-label do botão fechar (vem de strings).
 */
export type DialogProps = {
  title: string;
  description?: string;
  closeLabel: string;
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: ReactNode;
  /** `full` = tela cheia (editores como o de máscaras). Padrão `md` (480px). */
  size?: 'md' | 'full';
};

const sizes = {
  md: 'remoa-dialog left-1/2 top-1/2 w-[min(92vw,480px)] -translate-x-1/2 -translate-y-1/2 rounded-review',
  full: 'remoa-sheet inset-0 flex flex-col overflow-hidden',
};

export function Dialog({ title, description, closeLabel, trigger, children, size = 'md', ...root }: DialogProps) {
  return (
    <RD.Root {...root}>
      {trigger ? <RD.Trigger asChild>{trigger}</RD.Trigger> : null}
      <RD.Portal>
        <RD.Overlay className="remoa-overlay fixed inset-0 bg-navy/55 backdrop-blur-[3px]" />
        <RD.Content className={`fixed ${sizes[size]} border border-border bg-surface p-6 text-text shadow-lift`}>
          <RD.Title className="pr-10 font-display text-lg font-bold">{title}</RD.Title>
          {description ? (
            <RD.Description className="mt-1 text-sm text-muted">{description}</RD.Description>
          ) : null}
          <div className={size === 'full' ? 'mt-4 flex min-h-0 flex-1 flex-col' : 'mt-4'}>{children}</div>
          <RD.Close
            aria-label={closeLabel}
            className={`absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-btn text-muted hover:bg-primary-tint ${pressable} ${focusRing}`}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </RD.Close>
        </RD.Content>
      </RD.Portal>
    </RD.Root>
  );
}
