'use client';

import type { ReactElement } from 'react';
import * as TT from '@radix-ui/react-tooltip';

/** Dica ao foco ou hover. `children` precisa ser um único elemento (botão, link). */
export function Tooltip({ label, children }: { label: string; children: ReactElement }) {
  return (
    <TT.Provider delayDuration={280}>
      <TT.Root>
        <TT.Trigger asChild>{children}</TT.Trigger>
        <TT.Portal>
          <TT.Content sideOffset={8} className="remoa-pop z-50 rounded-tag bg-navy px-2.5 py-1.5 text-xs font-semibold text-white shadow-lift">
            {label}
            <TT.Arrow className="fill-navy" />
          </TT.Content>
        </TT.Portal>
      </TT.Root>
    </TT.Provider>
  );
}
