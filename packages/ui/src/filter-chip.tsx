import type { ComponentProps } from 'react';
import { focusRing } from './button-styles';

/**
 * FilterChip: chip de filtro/escolha, 44 px, 999 de raio, borda 1,5 px, 14 px/700. `pressed` vira `aria-pressed`
 * (marcado = borda --primary, fundo tint, texto deep). `count` opcional é o contador em pílula (22 px) à direita do rótulo.
 * Use dentro de um `role="group" aria-label`.
 */
export type FilterChipProps = Omit<ComponentProps<'button'>, 'className' | 'aria-pressed'> & { pressed: boolean; count?: number };

export function FilterChip({ pressed, count, children, type = 'button', ...rest }: FilterChipProps) {
  return (
    <button
      type={type}
      aria-pressed={pressed}
      {...rest}
      className={`flex h-11 items-center gap-2 rounded-pill border-[1.5px] px-[18px] text-sm font-bold transition-colors duration-150 ${
        pressed ? 'border-primary bg-primary-tint text-primary-deep' : 'border-border-strong bg-surface text-ink hover:border-primary'
      } ${focusRing}`}
    >
      {children}
      {count != null ? (
        <span className={`flex h-[22px] min-w-[22px] items-center justify-center rounded-pill px-1.5 text-xs ${pressed ? 'bg-primary text-on-primary' : 'bg-divider text-muted'}`}>
          {count}
        </span>
      ) : null}
    </button>
  );
}
