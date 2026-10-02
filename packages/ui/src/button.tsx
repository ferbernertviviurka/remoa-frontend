'use client';

import type { ComponentProps, ReactNode } from 'react';
import { clsx } from 'clsx';
import { TextMorph } from 'torph/react';
import { Spinner } from './spinner';

/**
 * Button (medidas v2: fonte do corpo 15 px/700). Variantes: variant = primary | secondary | quiet | danger | light | outline-light
 * (light e outline-light só sobre painel escuro: botão branco e botão com contorno branco).
 * Tamanhos: sm 44 px (raio 14) | md 48 px (raio 15, padrão) | hero 50 px (16 px, dentro do Hero) | lg 52 px (raio 16, 16 px, rodapé do Novo mapa) | touch 46 px mínimo (celular).
 * `primary` desabilitado vira cinza-lilás chapado (como no mock do Novo mapa).
 * `icon` fica antes do texto, `iconEnd` depois. Os dois são decorativos.
 * `loading` troca o ícone inicial pelo Spinner e, se `loadingLabel` vier, o Torph anima a troca do rótulo.
 * Sem className livre.
 */
export type ButtonProps = Omit<ComponentProps<'button'>, 'className'> & {
  variant?: 'primary' | 'secondary' | 'quiet' | 'danger' | 'light' | 'outline-light';
  size?: 'sm' | 'md' | 'lg' | 'hero' | 'touch';
  icon?: ReactNode;
  iconEnd?: ReactNode;
  loading?: boolean;
  loadingLabel?: string;
};

export const buttonVariants = {
  primary: 'font-bold bg-primary text-on-primary hover:brightness-110 disabled:bg-border-strong disabled:text-muted disabled:opacity-100 disabled:cursor-not-allowed',
  secondary: 'font-bold bg-surface text-ink border border-border-strong hover:border-primary hover:bg-primary-tint',
  quiet: 'font-bold bg-transparent text-primary-deep hover:bg-primary-tint',
  danger: 'font-bold bg-review text-white hover:brightness-110',
  light: 'bg-surface text-panel-dark font-extrabold hover:brightness-95',
  'outline-light': 'font-bold px-5! border-[1.5px] border-white/40 text-on-dark hover:bg-white/10',
} as const;

const sizes = {
  sm: 'min-h-11 rounded-[14px] px-4 text-[15px]',
  md: 'min-h-12 rounded-btn text-[15px]',
  hero: 'min-h-[50px] gap-2.5 rounded-btn px-6 text-base',
  lg: 'min-h-[52px] gap-2.5 rounded-field px-[26px] text-base',
  touch: 'min-h-[46px] min-w-[46px] rounded-btn px-5 text-[15px]',
} as const;

export const focusRing =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary';

export const pressable =
  'remoa-press cursor-pointer transition-[background-color,border-color,color,box-shadow,transform,filter] duration-150 ease-out hover:-translate-y-px active:translate-y-0 active:scale-[0.98]';

export const fieldControl =
  'w-full rounded-field border-[1.5px] border-border-strong bg-surface px-4 text-base font-semibold text-ink transition-[border-color,box-shadow] duration-150 placeholder:font-normal placeholder:text-muted hover:border-primary focus-visible:border-primary';

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
        'inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none disabled:hover:translate-y-0 disabled:active:scale-100 data-[loading=true]:opacity-100',
        pressable,
        focusRing,
        buttonVariants[variant],
        sizes[size],
        size === 'md' && (variant === 'primary' ? 'px-[22px]' : 'px-5'),
      )}
    >
      {leading ? <span aria-hidden="true" className="inline-flex shrink-0">{leading}</span> : null}
      <Label>{label}</Label>
      {iconEnd ? <span aria-hidden="true" className="inline-flex shrink-0">{iconEnd}</span> : null}
    </button>
  );
}
