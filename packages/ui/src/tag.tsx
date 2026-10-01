import type { ComponentProps } from 'react';
import { toneClasses, type Tone } from './tone';

/** Tag (raio 7). tone = brand | review | watch | steady | unknown. */
export type TagProps = Omit<ComponentProps<'span'>, 'className'> & { tone?: Tone };

export function Tag({ tone = 'brand', ...rest }: TagProps) {
  return <span {...rest} className={`inline-flex items-center rounded-tag px-2 py-0.5 text-xs font-semibold ${toneClasses[tone]}`} />;
}
