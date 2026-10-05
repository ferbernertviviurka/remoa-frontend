'use client';

import * as RS from '@radix-ui/react-switch';
import { focusRing } from '../button-styles';

/** Trilho + bolinha dos interruptores da central (medidas do mock; deslize de 250 ms vem de `.switch-thumb`). */
const SIZES = {
  cell: { track: 'h-6 w-10', thumb: 'size-[18px] data-[state=checked]:translate-x-4' },
  filter: { track: 'h-[26px] w-[46px]', thumb: 'size-5 data-[state=checked]:translate-x-5' },
  row: { track: 'h-7 w-[50px]', thumb: 'size-[22px] data-[state=checked]:translate-x-[22px]' },
} as const;

export type SwitchTrackProps = { size: keyof typeof SIZES; tone?: 'primary' | 'watch'; muted?: boolean };

export function SwitchTrack({ size, tone = 'primary', muted }: SwitchTrackProps) {
  const s = SIZES[size];
  const on = tone === 'watch' ? 'group-data-[state=checked]:bg-watch' : 'group-data-[state=checked]:bg-primary';
  return (
    <span aria-hidden="true" className={`relative block shrink-0 rounded-pill bg-unknown-soft transition-colors duration-200 ${s.track} ${muted ? 'group-data-[state=checked]:bg-unknown-soft' : on}`}>
      <RS.Thumb className={`switch-thumb absolute left-[3px] top-[3px] block rounded-pill bg-surface shadow ${s.thumb}`} />
    </span>
  );
}

/**
 * CompactSwitch: interruptor `role="switch"` com alvo de 44 px. `size="cell"` (célula da tabela: 56 × 44, trilho 40 × 24) ou `size="filter"` (trilho 46 × 26, rótulo à direita).
 * `label` sempre obrigatório; `hideLabel` o deixa só para leitor de tela. `muted` esmaece 200 ms (pausa de lembretes).
 */
export type CompactSwitchProps = {
  label: string;
  size: 'cell' | 'filter';
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  hideLabel?: boolean;
  muted?: boolean;
};

export function CompactSwitch({ label, size, hideLabel, muted, checked, onCheckedChange }: CompactSwitchProps) {
  const cell = size === 'cell';
  return (
    <RS.Root
      checked={checked}
      onCheckedChange={onCheckedChange}
      aria-label={hideLabel ? label : undefined}
      className={`group flex min-h-11 cursor-pointer items-center border-0 bg-transparent p-0 transition-opacity duration-200 ${cell ? 'w-14 justify-center' : 'gap-2.5 text-sm font-semibold text-ink'} ${muted ? 'opacity-45' : ''} ${focusRing}`}
    >
      <SwitchTrack size={size} muted={muted} />
      {hideLabel ? null : label}
    </RS.Root>
  );
}
