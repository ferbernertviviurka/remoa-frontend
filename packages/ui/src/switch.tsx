'use client';

import { useId, type ComponentProps } from 'react';
import * as RS from '@radix-ui/react-switch';
import { focusRing } from './button';

/** Switch com rótulo (`label` obrigatório). Controlado (checked/onCheckedChange) ou não (defaultChecked). */
export type SwitchProps = Omit<ComponentProps<typeof RS.Root>, 'className' | 'id' | 'children' | 'asChild'> & { label: string };

export function Switch({ label, ...rest }: SwitchProps) {
  const id = useId();
  return (
    <div className="flex items-center gap-2.5">
      <RS.Root
        id={id}
        {...rest}
        className={`relative h-[24px] w-[42px] rounded-pill border border-border bg-grid data-[state=checked]:border-primary data-[state=checked]:bg-primary ${focusRing}`}
      >
        <RS.Thumb className="block h-[18px] w-[18px] translate-x-[2px] rounded-pill bg-surface shadow transition-transform data-[state=checked]:translate-x-[20px] data-[state=checked]:bg-on-primary" />
      </RS.Root>
      <label htmlFor={id} className="text-sm text-text">{label}</label>
    </div>
  );
}
