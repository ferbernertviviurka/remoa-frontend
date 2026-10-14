import { strings } from '@remoa/strings/landing';

/** Static fallback (and the SSR list): the contract's `healthCourseCodes`, in order. Kept literal so the landing bundle ships no zod (D-535); courses.test.ts asserts it equals the contract. */
export const COURSE_CODES = [
  'medicine', 'psychology', 'dentistry', 'nursing', 'physiotherapy', 'pharmacy', 'biomedicine', 'nutrition', 'speech_therapy', 'physical_education',
  'veterinary_medicine', 'occupational_therapy', 'nursing_technician', 'social_work', 'biological_sciences', 'public_health', 'radiology', 'other_health', 'not_health',
] as const;
export type CourseCode = (typeof COURSE_CODES)[number];

/** FR-37: the seven most common courses. */
export const POPULAR_COURSES: readonly CourseCode[] = ['medicine', 'nursing', 'dentistry', 'pharmacy', 'physiotherapy', 'nutrition', 'psychology'];

export type CourseOption = { code: string; name: string; alias: string; goals: string[] };

const c = strings.landing.courses;
export const staticCourses = (): CourseOption[] => COURSE_CODES.map((code) => ({ code, name: c[code].name, alias: c[code].alias, goals: [] }));

type ApiCourse = { code: string; name: string; aliases?: string[]; suggestedGoals?: string[] };

/** GET /v1/public/reference/courses (public, `{ok,data}`); any failure returns null and the static list stays. Plain fetch: no zod here. */
export async function fetchCourses(base: string, signal?: AbortSignal): Promise<CourseOption[] | null> {
  try {
    const res = await fetch(`${base}/v1/public/reference/courses`, { signal });
    if (!res.ok) return null;
    const body = (await res.json()) as { ok?: boolean; data?: ApiCourse[] };
    if (!body.ok || !Array.isArray(body.data) || body.data.length === 0) return null;
    return body.data.map((k) => ({ code: k.code, name: k.name, alias: (k.aliases ?? []).join(' '), goals: k.suggestedGoals ?? [] }));
  } catch {
    return null;
  }
}
