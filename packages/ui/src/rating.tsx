'use client';

import { pressable, focusRing } from './button-styles';

const grades = ['again', 'hard', 'good', 'easy'] as const;
export type Grade = (typeof grades)[number];

/** Quatro notas de revisão. `labels` vem das strings do app. */
export function Rating({
  value,
  onValueChange,
  labels,
}: {
  value?: Grade;
  onValueChange?: (value: Grade) => void;
  labels: Record<Grade, string>;
}) {
  return (
    <div role="group" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {grades.map((grade) => {
        const on = value === grade;
        return (
          <button
            key={grade}
            type="button"
            aria-pressed={on}
            onClick={() => onValueChange?.(grade)}
            className={`min-h-11 rounded-btn border px-3 font-display text-sm font-bold ${pressable} ${focusRing} ${
              on ? 'border-primary bg-primary text-on-primary shadow-lift' : 'border-border bg-surface text-text shadow-card hover:border-primary hover:bg-primary-tint'
            }`}
          >
            {labels[grade]}
          </button>
        );
      })}
    </div>
  );
}
