'use client';
import { useMemo } from 'react';
import type { HealthCourse, HealthCourseCode } from '@remoa/contracts';
import { Autocomplete } from '@remoa/ui';
import { useCourses } from '../study-profile/reference';

/** Catalog course: null = medicine (the ENAMED catalog of today). A profile outside the health list falls back to it too. */
export const catalogCourse = (code: HealthCourseCode | null | undefined): HealthCourseCode | null => (!code || code === 'medicine' || code === 'not_health' ? null : code);

/** Courses the student can pick (never `not_health`) and the name of the current one. */
export function useCourseOptions(current: HealthCourseCode | null) {
  const all = useCourses();
  return useMemo(() => {
    const list: HealthCourse[] = all.filter((c) => c.kind !== 'not_health');
    const code = current ?? 'medicine';
    return { list, name: list.find((c) => c.code === code)?.name ?? '' };
  }, [all, current]);
}

export function CourseField({ label, placeholder, emptyLabel, value, onChange }: { label: string; placeholder: string; emptyLabel: string; value: HealthCourseCode | null; onChange: (code: HealthCourseCode) => void }) {
  const { list, name } = useCourseOptions(value);
  return (
    <Autocomplete
      label={label}
      placeholder={placeholder}
      emptyLabel={emptyLabel}
      options={list.map((c) => ({ value: c.code, label: c.name, keywords: c.aliases }))}
      value={{ value: value ?? 'medicine', label: name }}
      onValueChange={(next) => { if (next?.value) onChange(next.value as HealthCourseCode); }}
    />
  );
}
