import type { ComponentProps } from 'react';
import { clsx } from 'clsx';
import { buttonVariants, focusRing } from './button';

/**
 * IconButton (só ícone). `aria-label` OBRIGATÓRIO no tipo. variant = primary | secondary | quiet | danger;
 * size = md (46px no celular, 42px de md para cima) | touch (46px). O ícone vai em children.
 */
export type IconButtonProps = Omit<ComponentProps<'button'>, 'className' | 'aria-label'> & {
  'aria-label': string;
  variant?: 'primary' | 'secondary' | 'quiet' | 'danger';
  size?: 'md' | 'touch';
};

export function IconButton({ variant = 'quiet', size = 'md', type = 'button', children, ...rest }: IconButtonProps) {
  return (
    <button
      type={type}
      {...rest}
      className={clsx(
        'inline-flex items-center justify-center rounded-btn disabled:opacity-50 disabled:pointer-events-none',
        focusRing,
        buttonVariants[variant],
        size === 'touch' ? 'h-[46px] w-[46px]' : 'h-[46px] w-[46px] md:h-[42px] md:w-[42px]',
      )}
    >
      <span aria-hidden="true" className="inline-flex">{children}</span>
    </button>
  );
}
