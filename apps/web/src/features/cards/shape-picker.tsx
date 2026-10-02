'use client';

import { cardShapes, type CardShape } from '@remoa/contracts';
import { t } from '@remoa/strings';
import { ChoiceRow } from '@remoa/ui';

/** Outline previews (decorative), same proportions as the NodeCard shapes. */
const outline: Record<CardShape, string> = {
  rect: 'M5 4h26a4 4 0 0 1 4 4v8a4 4 0 0 1-4 4H5a4 4 0 0 1-4-4V8a4 4 0 0 1 4-4z',
  pill: 'M9 5h18a7 7 0 0 1 0 14H9A7 7 0 0 1 9 5z',
  circle: 'M18 2a10 10 0 1 1 0 20a10 10 0 1 1 0-20z',
  diamond: 'M18 1l11 11l-11 11L7 12z',
  hexagon: 'M11 3h14l6 9l-6 9H11L5 12z',
};

/** D-095: shape of a concept card on the map (5 options with a preview). */
export function ShapePicker({ value, onChange }: { value: CardShape; onChange: (s: CardShape) => void }) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-xs font-semibold text-text">{t('cards.shape.label')}</legend>
      {cardShapes.map((s) => (
        <ChoiceRow key={s} indicator="radio" selected={value === s} onSelect={() => onChange(s)}>
          <svg aria-hidden="true" width="36" height="24" viewBox="0 0 36 24" className="shrink-0 text-primary">
            <path d={outline[s]} fill="var(--primary-tint)" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
          </svg>
          {t(`cards.shape.${s}`)}
        </ChoiceRow>
      ))}
    </fieldset>
  );
}
