'use client';

import type { ReactNode } from 'react';
import * as RD from '@radix-ui/react-dialog';

/**
 * FullSheet (F23 FR-14, mock `mapa-mobile-editar`): folha branca em tela cheia que sobe até 52 px do topo (mais a safe area),
 * raio superior `--radius-hero`, com o mapa esmaecido por trás. Cabeçalho próprio: `start` (ex.: Cancelar), título e `end`
 * (ex.: Salvar). Sem X: fechar é responsabilidade de `start` e de Esc (`onOpenChange(false)`). Foco preso e devolvido (Radix).
 * Movimento: sobe em 500 ms (`remoa-fsheet`, tokens.css); reduzido aparece direto.
 */
export type FullSheetProps = {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** título visível e nome acessível do diálogo */
  title: string;
  start?: ReactNode;
  end?: ReactNode;
  children?: ReactNode;
};

export function FullSheet({ open, onOpenChange, title, start, end, children }: FullSheetProps) {
  return (
    <RD.Root open={open} onOpenChange={onOpenChange}>
      <RD.Portal>
        <RD.Overlay className="remoa-bscrim fixed inset-0 z-50 bg-[rgba(26,21,51,.55)]" />
        <RD.Content
          aria-describedby={undefined}
          className="remoa-fsheet fixed inset-x-0 bottom-0 top-[calc(52px+env(safe-area-inset-top))] z-[55] mx-auto flex w-full max-w-[640px] flex-col overflow-hidden rounded-t-hero bg-surface text-text shadow-[var(--shadow-sheet)] outline-none"
        >
          <header className="grid shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-2 border-b border-divider py-2 pl-3 pr-3">
            <div className="flex justify-start">{start}</div>
            <RD.Title className="m-0 max-w-[52vw] text-center font-display text-[17px] font-extrabold leading-tight tracking-[-0.02em]">{title}</RD.Title>
            <div className="flex justify-end">{end}</div>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
        </RD.Content>
      </RD.Portal>
    </RD.Root>
  );
}
