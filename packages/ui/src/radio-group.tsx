'use client';

import { useId } from 'react';
import * as RR from '@radix-ui/react-radio-group';
import { focusRing } from './button-styles';

/** Escolha única com rótulo de grupo. */
export function RadioGroup({
  label,
  options,
  value,
  defaultValue,
  onValueChange,
}: {
  label: string;
  options: ReadonlyArray<{ value: string; label: string }>;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-2">
      <p id={id} className="text-xs font-semibold text-text">{label}</p>
      <RR.Root aria-labelledby={id} value={value} defaultValue={defaultValue} onValueChange={onValueChange} className="flex flex-col gap-1">
        {options.map((option) => (
          <label key={option.value} className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-btn px-2 text-sm text-text hover:bg-primary-tint">
            <RR.Item
              value={option.value}
              className={`flex h-6 w-6 items-center justify-center rounded-pill border border-border bg-surface data-[state=checked]:border-primary ${focusRing}`}
            >
              <RR.Indicator className="h-3 w-3 rounded-pill bg-primary" />
            </RR.Item>
            {option.label}
          </label>
        ))}
      </RR.Root>
    </div>
  );
}
