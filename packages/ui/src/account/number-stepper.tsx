'use client';

import { Icon } from '../icons';
import { focusRing } from '../button-styles';

/**
 * NumberStepper: valor entre `min` e `max`, de `step` em `step`. Botões "menos"/"mais" de 44 px com `aria-label`
 * (`decLabel`/`incLabel`); o valor é anunciado (aria-live). No teto o "mais" continua clicável e chama `onLimit(max)`
 * em vez de `onChange` (para mostrar o aviso do Pro); no piso o "menos" fica desabilitado.
 */
export type NumberStepperProps = {
  label: string;
  value: number;
  onChange: (value: number) => void;
  onLimit?: (max: number) => void;
  min: number;
  max: number;
  step?: number;
  decLabel: string;
  incLabel: string;
  /** texto depois do número (ex.: "por dia"), opcional */
  unit?: string;
};

const btn = `flex h-11 w-11 items-center justify-center rounded-[11px] bg-surface text-ink transition-opacity duration-150 disabled:cursor-not-allowed disabled:opacity-40 ${focusRing}`;

export function NumberStepper({ label, value, onChange, onLimit, min, max, step = 1, decLabel, incLabel, unit }: NumberStepperProps) {
  return (
    <div role="group" aria-label={label} className="flex items-center gap-1.5 rounded-[14px] bg-track p-1">
      <button type="button" aria-label={decLabel} disabled={value <= min} onClick={() => onChange(Math.max(min, value - step))} className={btn}>
        <Icon name="minus" size={18} />
      </button>
      <span aria-live="polite" className="min-w-[64px] text-center font-display text-xl font-extrabold text-ink">
        {value}
        {unit ? <span className="ml-1 text-sm font-semibold text-muted">{unit}</span> : null}
      </span>
      <button
        type="button"
        aria-label={incLabel}
        onClick={() => (value + step > max ? onLimit?.(max) : onChange(value + step))}
        className={`${btn} ${value + step > max ? 'opacity-40' : ''}`}
      >
        <Icon name="plus" size={18} />
      </button>
    </div>
  );
}
