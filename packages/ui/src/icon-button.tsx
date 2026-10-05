import { forwardRef, type ComponentProps } from 'react';
import { clsx } from 'clsx';
import { buttonVariants, focusRing, pressable } from './button-styles';

/**
 * IconButton (só ícone). `aria-label` OBRIGATÓRIO no tipo. variant = primary | secondary | quiet | danger;
 * size = md (44 px, padrão, raio 14) | touch (46 px) | sm (36 px, só toolbar desktop do editor) | lg (48 px, raio 15; botão de fechar do Novo mapa tem 44 = md). O ícone vai em children.
 */
export type IconButtonProps = Omit<ComponentProps<'button'>, 'className' | 'aria-label'> & {
  'aria-label': string;
  variant?: 'primary' | 'secondary' | 'quiet' | 'danger';
  size?: 'md' | 'touch' | 'sm' | 'lg';
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { variant = 'quiet', size = 'md', type = 'button', children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      {...rest}
      className={clsx(
        'inline-flex shrink-0 items-center justify-center aria-pressed:bg-primary-tint aria-pressed:text-primary-deep disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100',
        pressable,
        focusRing,
        buttonVariants[variant],
        { sm: 'size-9 rounded-[12px]', md: 'size-11 rounded-[14px]', touch: 'size-[46px] rounded-[14px]', lg: 'size-12 rounded-btn' }[size],
      )}
    >
      <span aria-hidden="true" className="inline-flex">{children}</span>
    </button>
  );
});
