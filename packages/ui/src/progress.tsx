'use client';

import * as RP from '@radix-ui/react-progress';

/** Progress 0..max (padrão 100). `aria-label` obrigatório. */
export type ProgressProps = { 'aria-label': string; value: number; max?: number };

export function Progress({ value, max = 100, ...rest }: ProgressProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <RP.Root value={value} max={max} {...rest} className="h-2.5 w-full overflow-hidden rounded-pill bg-grid shadow-[inset_0_1px_2px_rgba(20,43,60,0.08)]">
      <RP.Indicator className="h-full rounded-pill bg-primary transition-[width] duration-300 ease-out" style={{ width: `${pct}%` }} />
    </RP.Root>
  );
}
