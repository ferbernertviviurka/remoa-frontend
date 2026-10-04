'use client';

import * as RR from '@radix-ui/react-radio-group';
import { focusRing } from '../button-styles';

/**
 * ChoiceChip: grupo de chips de escolha única (radiogroup; setas movem a escolha). `label` = nome do grupo.
 * `value` null = nada escolhido; escolher não desmarca. Chip de 44 px, 999 de raio (mesmo visual do FilterChip marcado).
 */
export type ChoiceChipProps = {
  label: string;
  options: ReadonlyArray<{ value: string; label: string }>;
  value: string | null;
  onValueChange: (value: string) => void;
};

export function ChoiceChip({ label, options, value, onValueChange }: ChoiceChipProps) {
  return (
    <RR.Root aria-label={label} value={value ?? ''} onValueChange={onValueChange} orientation="horizontal" className="flex flex-wrap gap-2">
      {options.map((o) => (
        <RR.Item
          key={o.value}
          value={o.value}
          className={`h-11 rounded-pill border-[1.5px] px-[18px] text-sm font-bold transition-colors duration-150 data-[state=checked]:border-primary data-[state=checked]:bg-primary-tint data-[state=checked]:text-primary-deep data-[state=unchecked]:border-border-strong data-[state=unchecked]:bg-surface data-[state=unchecked]:text-ink data-[state=unchecked]:hover:border-primary ${focusRing}`}
        >
          {o.label}
        </RR.Item>
      ))}
    </RR.Root>
  );
}
