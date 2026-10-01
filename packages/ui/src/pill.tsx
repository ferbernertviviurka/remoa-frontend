import type { ComponentProps } from 'react';
import { toneClasses, type Tone } from './tone';

/** Pílula (raio 999). tone = brand | review | watch | steady | unknown. Com borda do tom. */
export type PillProps = Omit<ComponentProps<'span'>, 'className'> & { tone?: Tone };

export function Pill({ tone = 'brand', ...rest }: PillProps) {
  return <span {...rest} className={`inline-flex items-center rounded-pill border border-current/15 px-3 py-1 text-xs font-semibold ${toneClasses[tone]}`} />;
}
