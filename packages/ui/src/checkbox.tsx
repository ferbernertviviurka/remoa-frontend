'use client';

import { useId, type ComponentProps, type ReactNode } from 'react';
import * as RC from '@radix-ui/react-checkbox';
import { focusRing } from './button-styles';

/** Checkbox com rótulo (`label` obrigatório; ReactNode permite links no texto). Controlado (checked/onCheckedChange) ou não (defaultChecked). */
export type CheckboxProps = Omit<ComponentProps<typeof RC.Root>, 'className' | 'id' | 'children' | 'asChild'> & { label: ReactNode };

export function Checkbox({ label, ...rest }: CheckboxProps) {
  const id = useId();
  return (
    <div className="flex min-h-11 items-center gap-2.5">
      <RC.Root
        id={id}
        {...rest}
        className={`flex h-6 w-6 cursor-pointer items-center justify-center rounded-tag border border-border bg-surface transition-colors duration-150 data-[state=checked]:border-primary data-[state=checked]:bg-primary ${focusRing}`}
      >
        <RC.Indicator className="text-on-primary">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M2.5 7.5l3 3 6-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </RC.Indicator>
      </RC.Root>
      <label htmlFor={id} className="text-sm text-text [&_a]:underline">{label}</label>
    </div>
  );
}
