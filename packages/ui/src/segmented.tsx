'use client';

import * as TG from '@radix-ui/react-toggle-group';
import { focusRing, pressable } from './button';

/**
 * Segmented (escolha única). `options` [{value,label}], `value`/`onValueChange` (controlado) ou `defaultValue`.
 * `aria-label` do grupo obrigatório. Não permite desmarcar.
 */
export type SegmentedProps = {
  'aria-label': string;
  options: ReadonlyArray<{ value: string; label: string }>;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
};

export function Segmented({ options, onValueChange, ...rest }: SegmentedProps) {
  return (
    <TG.Root
      type="single"
      {...rest}
      onValueChange={(v) => { if (v) onValueChange?.(v); }}
      className="inline-flex gap-1 rounded-btn border border-border bg-surface p-1"
    >
      {options.map((o) => (
        <TG.Item
          key={o.value}
          value={o.value}
          className={`min-h-11 rounded-tag px-3 text-sm font-semibold text-muted transition-colors duration-150 data-[state=on]:bg-primary data-[state=on]:text-on-primary ${pressable} ${focusRing}`}
        >
          {o.label}
        </TG.Item>
      ))}
    </TG.Root>
  );
}
