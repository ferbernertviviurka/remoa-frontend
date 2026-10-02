'use client';

import { useId, type ComponentProps } from 'react';
import { fieldControl, focusRing } from './button';
import { Icon } from './icons';

/**
 * Input de texto com rótulo (`label` obrigatório, ligado por id).
 * variant = field (padrão: rótulo visível em 15 px/700 acima, controle de 52 px, raio 16, borda 1,5 px) |
 * search (rótulo só para leitor de tela, lupa à esquerda, 48 px, raio 15, borda 1 px, 280 px de largura; `type="search"`).
 */
export type InputProps = Omit<ComponentProps<'input'>, 'className' | 'id'> & { label: string; variant?: 'field' | 'search' };

export function Input({ label, variant = 'field', ...rest }: InputProps) {
  const id = useId();
  if (variant === 'search') {
    return (
      <div className="relative">
        <label htmlFor={id} className="sr-only">{label}</label>
        <span aria-hidden="true" className="pointer-events-none absolute left-3.5 top-3.5 text-muted"><Icon name="search" size={20} /></span>
        <input
          id={id}
          type="search"
          {...rest}
          className={`h-12 w-[280px] max-w-full rounded-btn border border-border-strong bg-surface pl-11 pr-3.5 text-[15px] text-ink placeholder:text-muted hover:border-primary focus-visible:border-primary ${focusRing}`}
        />
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="font-bold text-ink">{label}</label>
      <input id={id} {...rest} className={`h-[52px] ${fieldControl} ${focusRing}`} />
    </div>
  );
}
