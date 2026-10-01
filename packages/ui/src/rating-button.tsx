import type { ReactNode } from 'react';
import { focusRing, pressable } from './button';

/**
 * RatingButton: uma nota FSRS com o intervalo logo abaixo ("Bom" / "4 dias").
 * `selected` marca a sugerida ou escolhida (aria-pressed). `shortcut` é só a tecla anunciada (aria-keyshortcuts).
 * Alvo de toque >= 44 px. Sem className livre.
 */
export type RatingButtonProps = {
  label: string;
  hint?: string;
  shortcut?: string;
  selected?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children?: ReactNode;
};

export function RatingButton({ label, hint, shortcut, selected = false, disabled, onClick }: RatingButtonProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-keyshortcuts={shortcut}
      disabled={disabled}
      onClick={onClick}
      className={`flex min-h-14 flex-col items-center justify-center rounded-btn border px-3 py-2 font-display text-sm font-bold disabled:pointer-events-none disabled:opacity-50 ${pressable} ${focusRing} ${
        selected ? 'border-primary bg-primary text-on-primary shadow-lift' : 'border-border bg-surface text-text shadow-card hover:border-primary hover:bg-primary-tint'
      }`}
    >
      <span>{label}</span>
      {hint ? <span className="text-xs font-semibold opacity-80">{hint}</span> : null}
    </button>
  );
}
