'use client';

import { t } from '@remoa/strings/landing';
import { Autocomplete, type AutocompleteValue } from '@remoa/ui';
import type { CourseOption } from './courses';

/** Lazy island body (island() in islands.tsx): the Autocomplete (Radix popover) stays out of the first-paint bundle. Free text maps to `other_health`. */
export function CoursePicker({ courses, selected, onPick }: { courses: CourseOption[]; selected: string | null; onPick: (code: string | null) => void }) {
  const cur = courses.find((k) => k.code === selected);
  const value: AutocompleteValue | null = cur ? { value: cur.code, label: cur.name } : null;
  return (
    <Autocomplete
      label={t('landing.picker.label')}
      placeholder={t('landing.picker.placeholder')}
      options={courses.map((k) => ({ value: k.code, label: k.name, keywords: [k.alias] }))}
      value={value}
      onValueChange={(v) => onPick(v ? (v.value ?? 'other_health') : null)}
      allowCustom
      customLabel={(text) => t('landing.picker.custom', { text })}
      emptyLabel={t('landing.picker.empty')}
      clearAriaLabel={t('landing.picker.clear')}
    />
  );
}
