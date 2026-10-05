'use client';

import { useId, type ComponentProps, type ReactNode } from 'react';
import * as RC from '@radix-ui/react-checkbox';
import { focusRing } from './button-styles';

/**
 * Checkbox com rótulo (`label` obrigatório; ReactNode permite links no texto). Controlado (checked/onCheckedChange) ou não (defaultChecked).
 * Caixa de 24 px alinhada à primeira linha do rótulo (que quebra sem deslocar a caixa); linha com 44 px de altura mínima e o rótulo inteiro clicável
 * (links dentro dele abrem sem alternar). `invalid` pinta a borda e marca `aria-invalid` (a mensagem fica a cargo de quem usa, ligada por `aria-describedby`).
 */
export type CheckboxProps = Omit<ComponentProps<typeof RC.Root>, 'className' | 'id' | 'children' | 'asChild'> & { label: ReactNode; invalid?: boolean };

export function Checkbox({ label, invalid, ...rest }: CheckboxProps) {
  const id = useId();
  return (
    <div className="flex items-start gap-3">
      <RC.Root
        id={id}
        aria-invalid={invalid || undefined}
        {...rest}
        className={`mt-2.5 flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-tag border-2 bg-surface ${invalid ? 'border-review' : 'border-border-strong'} transition-colors duration-150 data-[state=checked]:border-primary data-[state=checked]:bg-primary ${focusRing}`}
      >
        <RC.Indicator className="text-on-primary">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M2.5 7.5l3 3 6-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </RC.Indicator>
      </RC.Root>
      <label htmlFor={id} className="min-h-11 flex-1 cursor-pointer py-2.5 text-[15px] leading-6 text-text [&_a]:font-semibold [&_a]:text-primary-deep [&_a]:underline">{label}</label>
    </div>
  );
}
