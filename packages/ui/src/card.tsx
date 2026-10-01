import type { ComponentProps } from 'react';
import { clsx } from 'clsx';

/** Card (superfície com borda e sombra). radius = map (15) | review (24). padded = true por padrão. */
export type CardProps = Omit<ComponentProps<'div'>, 'className'> & { radius?: 'map' | 'review'; padded?: boolean };

export function Card({ radius = 'map', padded = true, ...rest }: CardProps) {
  return (
    <div
      {...rest}
      className={clsx(
        'border border-border bg-surface text-text shadow-card transition-shadow duration-200',
        radius === 'map' ? 'rounded-map' : 'rounded-review',
        padded && 'p-4',
      )}
    />
  );
}
