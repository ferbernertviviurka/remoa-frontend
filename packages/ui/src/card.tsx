import type { ComponentProps } from 'react';
import { clsx } from 'clsx';

/** Card (superfície com borda e sombra). radius = map (20) | review (24) | list (26). padded = true por padrão. */
export type CardProps = Omit<ComponentProps<'div'>, 'className'> & { radius?: 'map' | 'review' | 'list'; padded?: boolean };

export function Card({ radius = 'map', padded = true, ...rest }: CardProps) {
  return (
    <div
      {...rest}
      className={clsx(
        'border border-border bg-surface text-text shadow-card transition-shadow duration-200',
        { map: 'rounded-map', review: 'rounded-review', list: 'rounded-list' }[radius],
        padded && 'p-4',
      )}
    />
  );
}
