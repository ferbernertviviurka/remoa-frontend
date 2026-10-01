'use client';

import { useId, type ComponentProps } from 'react';
import * as RS from '@radix-ui/react-switch';
import { focusRing } from './button';

/** Switch com rótulo (`label` obrigatório). Controlado (checked/onCheckedChange) ou não (defaultChecked). */
export type SwitchProps = Omit<ComponentProps<typeof RS.Root>, 'className' | 'id' | 'children' | 'asChild'> & { label: string };

export function Switch({ label, ...rest }: SwitchProps) {
  const id = useId();
  return (
    <div className="flex min-h-11 items-center gap-2.5">
      <RS.Root
        id={id}
        {...rest}
        className={`relative h-6 w-11 cursor-pointer rounded-pill border border-border bg-grid transition-colors duration-150 data-[state=checked]:border-primary data-[state=checked]:bg-primary ${focusRing}`}
      >
        <RS.Thumb className="block h-[18px] w-[18px] translate-x-0.5 rounded-pill bg-surface shadow transition-transform duration-150 data-[state=checked]:translate-x-[22px] data-[state=checked]:bg-on-primary" />
      </RS.Root>
      <label htmlFor={id} className="text-sm text-text">{label}</label>
    </div>
  );
}
