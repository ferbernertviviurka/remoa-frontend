import { useId, type ComponentProps } from 'react';
import { focusRing } from './button';

/** Textarea com rótulo visível (`label` obrigatório, ligado por id). Sem variantes. */
export type TextareaProps = Omit<ComponentProps<'textarea'>, 'className' | 'id'> & { label: string };

export function Textarea({ label, rows = 4, ...rest }: TextareaProps) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-xs font-semibold text-text">{label}</label>
      <textarea
        id={id}
        rows={rows}
        {...rest}
        className={`rounded-btn border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-muted ${focusRing}`}
      />
    </div>
  );
}
