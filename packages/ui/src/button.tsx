'use client';

import type { ComponentProps, ReactNode } from 'react';
import { clsx } from 'clsx';
import { useTextMorph } from './morph';
import { Spinner } from './spinner';
import { buttonVariants, focusRing, pressable } from './button-styles';

/**
 * Button (medidas v2: fonte do corpo 15 px/700). Variantes: variant = primary | secondary | quiet | danger | light | outline-light
 * (light e outline-light só sobre painel escuro: botão branco e botão com contorno branco).
 * Tamanhos: sm 44 px (raio 14) | md 48 px (raio 15, padrão) | hero 50 px (16 px, dentro do Hero) | lg 52 px (raio 16, 16 px, rodapé do Novo mapa) | cta 56 px (17 px/800, resumo do pedido de Planos) | touch 46 px mínimo (celular).
 * `primary` desabilitado vira cinza-lilás chapado (como no mock do Novo mapa).
 * `icon` fica antes do texto, `iconEnd` depois. Os dois são decorativos.
 * `loading` troca o ícone inicial pelo Spinner e, se `loadingLabel` vier, o Torph anima a troca do rótulo.
 *   O Torph (~10,5 KB) baixa depois da primeira pintura (P-512): até lá o rótulo é texto simples, igual ao HTML do servidor. Com movimento
 *   reduzido (sistema ou `<html data-motion="reduced">`) ele nem baixa e a troca é direta.
 * `aria-disabled` (sem `disabled`) esmaece mas mantém o foco: para explicar o bloqueio numa Tooltip.
 * Sem className livre.
 */
export type ButtonProps = Omit<ComponentProps<'button'>, 'className'> & {
  variant?: 'primary' | 'secondary' | 'quiet' | 'danger' | 'light' | 'outline-light';
  size?: 'sm' | 'md' | 'lg' | 'cta' | 'hero' | 'touch';
  icon?: ReactNode;
  iconEnd?: ReactNode;
  loading?: boolean;
  loadingLabel?: string;
  /** `start` alinha ícone e rótulo à esquerda (botões de lateral). Padrão: centralizado. */
  align?: 'center' | 'start';
};

const sizes = {
  sm: 'min-h-11 rounded-[14px] px-4 text-[15px]',
  md: 'min-h-12 rounded-btn text-[15px]',
  hero: 'min-h-[50px] gap-2.5 rounded-btn px-6 text-base',
  lg: 'min-h-[52px] gap-2.5 rounded-field px-[26px] text-base',
  cta: 'min-h-14 gap-2.5 rounded-field px-[26px] text-[17px] font-extrabold!',
  touch: 'min-h-[46px] min-w-[46px] rounded-btn px-5 text-[15px]',
} as const;

function Label({ children }: { children: ReactNode }) {
  const M = useTextMorph();
  if (typeof children === 'string' || typeof children === 'number') {
    return M ? (
      <M duration={280} ease="cubic-bezier(0.19, 1, 0.22, 1)" locale="pt-BR" className="text-inherit">
        {children}
      </M>
    ) : (
      <span className="text-inherit">{children}</span>
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
  align = 'center',
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
        'inline-flex items-center gap-2 aria-disabled:opacity-50 aria-disabled:cursor-not-allowed disabled:opacity-50 disabled:pointer-events-none disabled:hover:translate-y-0 disabled:active:scale-100 data-[loading=true]:opacity-100',
        align === 'start' ? 'justify-start text-left' : 'justify-center',
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
