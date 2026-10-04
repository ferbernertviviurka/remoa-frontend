'use client';

import { useId, type ComponentProps } from 'react';
import { fieldControl, focusRing } from './button-styles';

/** Textarea com rótulo visível (`label` obrigatório, ligado por id). Sem variantes. */
export type TextareaProps = Omit<ComponentProps<'textarea'>, 'className' | 'id'> & { label: string };

export function Textarea({ label, rows = 4, ...rest }: TextareaProps) {
  const id = useId();
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="font-bold text-ink">{label}</label>
      <textarea
        id={id}
        rows={rows}
        {...rest}
        className={`py-2.5 ${fieldControl} ${focusRing}`}
      />
    </div>
  );
}
