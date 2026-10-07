'use client';

import * as RP from '@radix-ui/react-progress';
import { clsx } from 'clsx';

/**
 * Progress 0..max (padrão 100). `aria-label` obrigatório. `busy`: um brilho suave corre pela barra enquanto o valor não muda
 * (etapa longa de servidor); some com movimento reduzido. `size="sm"`: trilho fino, para status discreto.
 */
export type ProgressProps = { 'aria-label': string; value: number; max?: number; busy?: boolean; size?: 'sm' | 'md' };

export function Progress({ value, max = 100, busy = false, size = 'md', ...rest }: ProgressProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <RP.Root value={value} max={max} {...rest} className={clsx('w-full overflow-hidden rounded-pill bg-grid', size === 'sm' ? 'h-1.5' : 'h-2.5 shadow-[inset_0_1px_2px_rgba(20,43,60,0.08)]')}>
      <RP.Indicator className={clsx('h-full rounded-pill bg-primary transition-[width] duration-700 ease-out', busy && 'st-shine')} style={{ width: `${pct}%` }} />
    </RP.Root>
  );
}
