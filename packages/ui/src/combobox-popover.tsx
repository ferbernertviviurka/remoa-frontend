'use client';

import type { ReactNode, RefObject } from 'react';
import * as Popover from '@radix-ui/react-popover';

/**
 * P-516: o Radix Popover + Popper do Combobox, baixado só na 1ª interação (foco ou ponteiro no campo). O campo e os chips ficam em combobox.tsx,
 * fora daqui, então o foco e o cursor não mudam quando isto monta; a âncora é o contêiner do campo, por `virtualRef`.
 */
export default function ComboboxPopover({ anchor, label, onOpenChange, children }: { anchor: RefObject<HTMLDivElement | null>; label: string; onOpenChange: (open: boolean) => void; children: ReactNode }) {
  return (
    <Popover.Root open onOpenChange={onOpenChange}>
      <Popover.Anchor virtualRef={anchor} />
      <Popover.Portal>
        <Popover.Content
          onOpenAutoFocus={(e) => e.preventDefault()}
          onInteractOutside={() => onOpenChange(false)}
          sideOffset={6}
          align="start"
          aria-label={label}
          className="z-50 w-[var(--radix-popover-trigger-width)] rounded-map border border-border bg-surface p-1 shadow-lift"
        >
          {children}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
