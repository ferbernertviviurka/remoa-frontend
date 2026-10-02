'use client';

import * as TG from '@radix-ui/react-toggle-group';
import { focusRing, pressable } from './button';

export const segTrack = 'inline-flex gap-1 rounded-[16px] bg-track p-1';
export const segItem = 'inline-flex items-center justify-center rounded-[12px] text-muted data-[state=on]:bg-surface data-[state=on]:text-primary-deep aria-[current=page]:bg-surface aria-[current=page]:text-primary-deep aria-pressed:bg-surface aria-pressed:text-primary-deep font-bold transition-colors duration-150';

/**
 * Segmented (escolha única, v2): trilho --track de raio 16 com padding 4; opção de 38 px, raio 12, 14 px/700; ativa = branca com texto --primary-deep.
 * Também é o visual de SegmentedLink e ViewToggle (`segTrack`, `segItem`). `options` [{value,label}], `value`/`onValueChange` (controlado) ou `defaultValue`.
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
      className={segTrack}
    >
      {options.map((o) => (
        <TG.Item
          key={o.value}
          value={o.value}
          className={`h-[38px] px-5 text-sm ${segItem} ${pressable} ${focusRing}`}
        >
          {o.label}
        </TG.Item>
      ))}
    </TG.Root>
  );
}
