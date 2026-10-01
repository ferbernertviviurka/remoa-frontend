import type { ComponentProps, ReactNode } from 'react';
import { clsx } from 'clsx';

/**
 * Button. Variantes: variant = primary | secondary | quiet | danger; size = md (46px no celular, 42px de md para cima) | touch (46px sempre).
 * `icon` opcional (decorativo, antes do texto). Sem className livre.
 */
export type ButtonProps = Omit<ComponentProps<'button'>, 'className'> & {
  variant?: 'primary' | 'secondary' | 'quiet' | 'danger';
  size?: 'md' | 'touch';
  icon?: ReactNode;
};

export const buttonVariants = {
  primary: 'bg-primary text-on-primary hover:opacity-90',
  secondary: 'bg-surface text-text border border-border hover:bg-primary-tint',
  quiet: 'bg-transparent text-primary-deep hover:bg-primary-tint',
  danger: 'bg-review text-white hover:opacity-90',
} as const;

export const focusRing =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary';

export function Button({ variant = 'primary', size = 'md', icon, children, type = 'button', ...rest }: ButtonProps) {
  return (
    <button
      type={type}
      {...rest}
      className={clsx(
        'inline-flex items-center justify-center gap-2 rounded-btn px-4 font-display text-sm font-bold disabled:opacity-50 disabled:pointer-events-none',
        focusRing,
        buttonVariants[variant],
        size === 'touch' ? 'min-h-[46px] min-w-[46px]' : 'min-h-[46px] md:min-h-[42px]',
      )}
    >
      {icon ? <span aria-hidden="true" className="inline-flex">{icon}</span> : null}
      {children}
    </button>
  );
}
