'use client';

import type { ReactNode } from 'react';
import * as TG from '@radix-ui/react-toggle-group';
import { focusRing, pressable } from './button-styles';

export const segTrack = 'inline-flex gap-1 rounded-[16px] bg-track p-1';
export const segItem = 'inline-flex items-center justify-center rounded-[12px] text-muted data-[state=on]:bg-surface data-[state=on]:text-primary-deep aria-[current=page]:bg-surface aria-[current=page]:text-primary-deep aria-pressed:bg-surface aria-pressed:text-primary-deep font-bold transition-colors duration-150';

/**
 * Segmented (escolha única, v2): trilho --track de raio 16 com padding 4; opção de 38 px, raio 12, 14 px/700; ativa = branca com texto --primary-deep.
 * Também é o visual de SegmentedLink e ViewToggle (`segTrack`, `segItem`). `options` [{value,label}], `value`/`onValueChange` (controlado) ou `defaultValue`.
 * `aria-label` do grupo obrigatório. Não permite desmarcar.
 */
export type SegmentedProps = {
  'aria-label': string;
  options: ReadonlyArray<{ value: string; label: string; disabled?: boolean; badge?: ReactNode; describedBy?: string }>;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Ocupa a largura toda em colunas iguais; rótulo longo quebra centrado e a pílula cresce com ele. */
  fill?: boolean;
};

export function Segmented({ options, onValueChange, fill, ...rest }: SegmentedProps) {
  return (
    <TG.Root
      type="single"
      {...rest}
      onValueChange={(v) => { if (v) onValueChange?.(v); }}
      className={fill ? `${segTrack} flex w-full` : segTrack}
    >
      {options.map((o) => (
        <TG.Item
          key={o.value}
          value={o.value}
          disabled={o.disabled}
          aria-disabled={o.disabled || undefined}
          aria-describedby={o.describedBy}
          className={`${fill ? 'min-h-[38px] min-w-0 flex-1 basis-0 px-3 py-1.5 text-center leading-tight max-lg:min-h-11' : 'h-[38px] px-5 max-lg:h-11'} text-sm ${segItem} ${pressable} ${focusRing}`}
        >
          {o.label}
          {o.badge ? <span className="ml-2">{o.badge}</span> : null}
        </TG.Item>
      ))}
    </TG.Root>
  );
}
