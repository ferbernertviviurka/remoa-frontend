'use client';

import * as RP from '@radix-ui/react-progress';

/** Progress 0..max (padrão 100). `aria-label` obrigatório. */
export type ProgressProps = { 'aria-label': string; value: number; max?: number };

export function Progress({ value, max = 100, ...rest }: ProgressProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <RP.Root value={value} max={max} {...rest} className="h-2 w-full overflow-hidden rounded-pill bg-grid">
      <RP.Indicator className="h-full rounded-pill bg-primary" style={{ width: `${pct}%` }} />
    </RP.Root>
  );
}
