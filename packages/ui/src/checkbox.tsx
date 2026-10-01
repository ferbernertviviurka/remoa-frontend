'use client';

import { useId, type ComponentProps } from 'react';
import * as RC from '@radix-ui/react-checkbox';
import { focusRing } from './button';

/** Checkbox com rótulo (`label` obrigatório). Controlado (checked/onCheckedChange) ou não (defaultChecked). */
export type CheckboxProps = Omit<ComponentProps<typeof RC.Root>, 'className' | 'id' | 'children' | 'asChild'> & { label: string };

export function Checkbox({ label, ...rest }: CheckboxProps) {
  const id = useId();
  return (
    <div className="flex items-center gap-2.5">
      <RC.Root
        id={id}
        {...rest}
        className={`flex h-[22px] w-[22px] items-center justify-center rounded-tag border border-border bg-surface data-[state=checked]:border-primary data-[state=checked]:bg-primary ${focusRing}`}
      >
        <RC.Indicator className="text-on-primary">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M2.5 7.5l3 3 6-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </RC.Indicator>
      </RC.Root>
      <label htmlFor={id} className="text-sm text-text">{label}</label>
    </div>
  );
}
