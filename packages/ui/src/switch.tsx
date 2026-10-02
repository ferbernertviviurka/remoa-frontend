'use client';

import { useId, type ComponentProps } from 'react';
import * as RS from '@radix-ui/react-switch';
import { focusRing } from './button';

/**
 * Switch com rótulo (`label` obrigatório). Controlado (checked/onCheckedChange) ou não (defaultChecked).
 * `size="lg"` = visual da conta (trilho 56 × 32, bolinha 26, deslize de 250 ms; alvo de 44 px).
 */
export type SwitchProps = Omit<ComponentProps<typeof RS.Root>, 'className' | 'id' | 'children' | 'asChild'> & { label: string; size?: 'md' | 'lg'; /** rótulo só para leitor de tela (a linha já mostra o texto) */ hideLabel?: boolean };

export function Switch({ label, size = 'md', hideLabel, ...rest }: SwitchProps) {
  const id = useId();
  const lg = size === 'lg';
  return (
    <div className="flex min-h-11 items-center gap-2.5">
      <RS.Root
        id={id}
        {...rest}
        className={`relative cursor-pointer rounded-pill border border-border bg-grid transition-colors duration-200 data-[state=checked]:border-primary data-[state=checked]:bg-primary ${
          lg ? "h-8 w-14 border-unknown bg-unknown after:absolute after:-inset-x-0.5 after:-inset-y-[7px] after:content-['']" : 'h-6 w-11'
        } ${focusRing}`}
      >
        <RS.Thumb
          className={`switch-thumb block rounded-pill bg-surface shadow ${
            lg ? 'h-[26px] w-[26px] translate-x-[3px] data-[state=checked]:translate-x-[27px]' : 'h-[18px] w-[18px] translate-x-0.5 data-[state=checked]:translate-x-[22px]'
          } data-[state=checked]:bg-on-primary`}
        />
      </RS.Root>
      <label htmlFor={id} className={hideLabel ? 'sr-only' : 'text-sm text-text'}>{label}</label>
    </div>
  );
}
