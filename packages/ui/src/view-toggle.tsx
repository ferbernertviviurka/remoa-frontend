'use client';

import { focusRing } from './button';
import { Icon, type IconName } from './icons';
import { segItem, segTrack } from './segmented';

/**
 * ViewToggle: alternância de visualização só com ícones (grade/lista), mesmo trilho do Segmented. Cada opção é um <button aria-pressed>
 * de 44 × 40 com `label` como `aria-label` (obrigatório). `value`/`onValueChange` (controlado). `aria-label` do grupo obrigatório.
 */
export type ViewToggleProps = {
  'aria-label': string;
  options: ReadonlyArray<{ value: string; label: string; icon: IconName }>;
  value: string;
  onValueChange: (value: string) => void;
};

export function ViewToggle({ options, value, onValueChange, ...rest }: ViewToggleProps) {
  return (
    <span role="group" {...rest} className={segTrack}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-label={o.label}
          aria-pressed={o.value === value}
          onClick={() => onValueChange(o.value)}
          className={`h-10 w-11 ${segItem} ${focusRing}`}
        >
          <Icon name={o.icon} size={20} />
        </button>
      ))}
    </span>
  );
}
