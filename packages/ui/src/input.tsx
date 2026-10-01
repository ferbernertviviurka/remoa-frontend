import { useId, type ComponentProps } from 'react';
import { fieldControl, focusRing } from './button';

/** Input de texto com rótulo visível (`label` obrigatório, ligado por id). Sem variantes. */
export type InputProps = Omit<ComponentProps<'input'>, 'className' | 'id'> & { label: string };

export function Input({ label, ...rest }: InputProps) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-xs font-semibold text-text">{label}</label>
      <input
        id={id}
        {...rest}
        className={`min-h-11 ${fieldControl} ${focusRing}`}
      />
    </div>
  );
}
