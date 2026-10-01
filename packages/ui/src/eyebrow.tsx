import type { ComponentProps } from 'react';

/** Eyebrow: rótulo maiúsculo 11px, letter-spacing .13em. Sem variantes. */
export type EyebrowProps = Omit<ComponentProps<'span'>, 'className'>;

export function Eyebrow(props: EyebrowProps) {
  return <span {...props} className="text-[11px] font-bold uppercase tracking-[.13em] text-muted" />;
}
