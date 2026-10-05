'use client';

import type { ReactElement } from 'react';
import * as TT from '@radix-ui/react-tooltip';

/**
 * Dica ao foco ou hover. `children` precisa ser um único elemento (botão, link).
 * `open`/`onOpenChange` (opcionais) deixam o chamador abrir no toque: o Radix fecha a dica no clique, então o gatilho
 * chama `preventDefault()` no próprio onClick e abre (ex.: botão `aria-disabled` que explica por que está bloqueado).
 */
export function Tooltip({ label, children, open, onOpenChange }: { label: string; children: ReactElement; open?: boolean; onOpenChange?: (open: boolean) => void }) {
  return (
    <TT.Provider delayDuration={280}>
      <TT.Root open={open} onOpenChange={onOpenChange}>
        <TT.Trigger asChild>{children}</TT.Trigger>
        <TT.Portal>
          <TT.Content sideOffset={8} className="remoa-pop z-50 max-w-[300px] rounded-tag bg-navy px-2.5 py-1.5 text-xs font-semibold leading-[1.45] text-white shadow-lift">
            {label}
            <TT.Arrow className="fill-navy" />
          </TT.Content>
        </TT.Portal>
      </TT.Root>
    </TT.Provider>
  );
}
