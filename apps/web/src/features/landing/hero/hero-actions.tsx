'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import { strings, t } from '@remoa/strings/landing';
import { FilterChip } from '@remoa/ui';
import { apiBase } from '@/lib/api/base';
import type { LaunchPhase } from '../flags';
import { CoursePickerIsland, afterLoadIdle } from '../islands';
import { setSelectedCourse, useSelectedCourse } from '../shell/selected-course';
import { signupHref } from '../shell/signup-href';
import { HeroCtas } from './hero-ctas';
import { POPULAR_COURSES, fetchCourses, staticCourses, type CourseOption } from './courses';

/** Per-course message (FR-37, D-099): only Medicina promises ready maps; every other course says "a caminho". */
export function courseMessage(course: CourseOption): string {
  if (course.code === 'medicine') return t('landing.picker.messages.medicine');
  if (course.code === 'not_health') return t('landing.picker.messages.notHealth');
  return t('landing.picker.messages.other', { course: course.name });
}

const goalName = (code: string) => (strings.landing.goalNames as Record<string, string>)[code];

/** Hero actions: CTAs + microcopy + course picker. The chosen course rides the CTA (`/cadastro?curso=…&de=landing`) and is kept for the plans and final CTA. */
export function HeroActions({ launchPhase }: { launchPhase: LaunchPhase }) {
  const selected = useSelectedCourse();
  const [courses, setCourses] = useState<CourseOption[]>(staticCourses);
  useEffect(() => {
    const ac = new AbortController();
    void afterLoadIdle().then(() => fetchCourses(apiBase(), ac.signal)).then((list) => { if (list && !ac.signal.aborted) setCourses(list); });
    return () => ac.abort();
  }, []);

  const byCode = (code: string) => courses.find((k) => k.code === code);
  const current = selected ? byCode(selected) : undefined;
  const goals = current?.goals.map(goalName).filter(Boolean).slice(0, 3) ?? [];

  return (
    <>
      <HeroCtas launchPhase={launchPhase} href={launchPhase === 'open' ? signupHref({ curso: selected }) : '#cta'} />
      <span className="hx-in text-sm text-muted" style={{ '--d': '.4s' } as CSSProperties}>{t('landing.hero.microcopy')}</span>
      <div className="hx-in mt-2 flex w-full max-w-[640px] flex-col items-center gap-3 text-left" style={{ '--d': '.5s' } as CSSProperties}>
        <div className="w-full">
          <CoursePickerIsland courses={courses} selected={selected} onPick={setSelectedCourse} />
        </div>
        <div role="group" aria-label={t('landing.picker.chipsLabel')} className="flex flex-wrap justify-center gap-2">
          {POPULAR_COURSES.map((code) => {
            const k = byCode(code);
            return k ? <FilterChip key={code} pressed={selected === code} onClick={() => setSelectedCourse(selected === code ? null : code)}>{k.name}</FilterChip> : null;
          })}
        </div>
        <p aria-live="polite" className="m-0 min-h-6 text-center text-[15px] leading-normal text-muted">
          {current ? courseMessage(current) : null}
          {goals.length > 0 ? ` ${t('landing.picker.goals', { goals: goals.join(', ') })}` : null}
        </p>
      </div>
    </>
  );
}
