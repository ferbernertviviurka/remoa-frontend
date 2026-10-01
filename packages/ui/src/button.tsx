'use client';

import type { ComponentProps, ReactNode } from 'react';
import { clsx } from 'clsx';
import { TextMorph } from 'torph/react';
import { Spinner } from './spinner';

/**
 * Button. Variantes: variant = primary | secondary | quiet | danger; size = md (46px no celular, 42px de md para cima) | touch (46px sempre).
 * `icon` fica antes do texto, `iconEnd` depois. Os dois são decorativos.
 * `loading` troca o ícone inicial pelo Spinner e, se `loadingLabel` vier, o Torph anima a troca do rótulo.
 * Sem className livre.
 */
export type ButtonProps = Omit<ComponentProps<'button'>, 'className'> & {
  variant?: 'primary' | 'secondary' | 'quiet' | 'danger';
  size?: 'md' | 'touch';
  icon?: ReactNode;
  iconEnd?: ReactNode;
  loading?: boolean;
  loadingLabel?: string;
};

export const buttonVariants = {
  primary: 'bg-primary text-on-primary shadow-lift hover:brightness-110',
  secondary: 'bg-surface text-text border border-border shadow-card hover:border-primary hover:bg-primary-tint',
  quiet: 'bg-transparent text-primary-deep hover:bg-primary-tint',
  danger: 'bg-review text-white shadow-lift hover:brightness-110',
} as const;

export const focusRing =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary';

export const pressable =
  'remoa-press cursor-pointer transition-[background-color,border-color,color,box-shadow,transform,filter] duration-150 ease-out hover:-translate-y-px active:translate-y-0 active:scale-[0.98]';

export const fieldControl =
  'w-full rounded-btn border border-border bg-surface px-3 text-sm text-text shadow-card transition-[border-color,box-shadow] duration-150 placeholder:text-muted hover:border-primary focus-visible:border-primary';

function Label({ children }: { children: ReactNode }) {
  if (typeof children === 'string' || typeof children === 'number') {
    return (
      <TextMorph duration={280} ease="cubic-bezier(0.19, 1, 0.22, 1)" locale="pt-BR" className="text-inherit">
        {children}
      </TextMorph>
    );
  }
  return children;
}

export function Button({
  variant = 'primary',
  size = 'md',
  icon,
  iconEnd,
  loading = false,
  loadingLabel,
  children,
  type = 'button',
  disabled,
  ...rest
}: ButtonProps) {
  const leading = loading ? <Spinner /> : icon;
  const label = loading && loadingLabel != null ? loadingLabel : children;
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      data-loading={loading || undefined}
      {...rest}
      className={clsx(
        'inline-flex items-center justify-center gap-2 rounded-btn px-4 font-display text-sm font-bold tracking-tight disabled:opacity-50 disabled:pointer-events-none disabled:hover:translate-y-0 disabled:active:scale-100 data-[loading=true]:opacity-100',
        pressable,
        focusRing,
        buttonVariants[variant],
        size === 'touch' ? 'min-h-[46px] min-w-[46px]' : 'min-h-[46px] md:min-h-[42px]',
      )}
    >
      {leading ? <span aria-hidden="true" className="inline-flex shrink-0">{leading}</span> : null}
      <Label>{label}</Label>
      {iconEnd ? <span aria-hidden="true" className="inline-flex shrink-0">{iconEnd}</span> : null}
    </button>
  );
}
