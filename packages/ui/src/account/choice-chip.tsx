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

/**
 * ChoiceChipMulti: chips de escolha múltipla (botões `aria-pressed` num `role="group"`). `values` na ordem escolhida; `full` trava os não marcados
 * (limite atingido, calculado por quem usa: pode valer para vários grupos; os marcados continuam desmarcáveis). Mesmo visual do ChoiceChip.
 */
export type ChoiceChipMultiProps = {
  label: string;
  options: ReadonlyArray<{ value: string; label: string }>;
  values: ReadonlyArray<string>;
  onValuesChange: (values: string[]) => void;
  full?: boolean;
};

export function ChoiceChipMulti({ label, options, values, onValuesChange, full = false }: ChoiceChipMultiProps) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = values.includes(o.value);
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={on}
            disabled={!on && full}
            onClick={() => onValuesChange(on ? values.filter((v) => v !== o.value) : [...values, o.value])}
            className={`h-11 rounded-pill border-[1.5px] px-[18px] text-sm font-bold transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-60 ${on ? 'border-primary bg-primary-tint text-primary-deep' : 'border-border-strong bg-surface text-ink hover:border-primary'} ${focusRing}`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
