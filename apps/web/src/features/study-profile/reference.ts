'use client';
import { useEffect, useState } from 'react';
import type { HealthCourse, StudyGoal } from '@remoa/contracts';
import { listCourses, listGoals } from './api';

/** FR-17: courses are a short list, read once per page load; goals once per course. A failure is not cached (next mount retries). */
let courses: Promise<HealthCourse[]> | null = null;
const goals = new Map<string, Promise<StudyGoal[]>>();

export function readCourses(): Promise<HealthCourse[]> {
  courses ??= listCourses().then((r) => (r.ok ? r.data : Promise.reject(r.error))).catch(() => { courses = null; return []; });
  return courses;
}
/** `course` undefined = every goal (names for chips of goals picked under another course). */
export function readGoals(course?: string): Promise<StudyGoal[]> {
  const key = course ?? '*';
  let p = goals.get(key);
  if (!p) {
    p = listGoals(course).then((r) => (r.ok ? r.data : Promise.reject(r.error))).catch(() => { goals.delete(key); return []; });
    goals.set(key, p);
  }
  return p;
}

function useRead<T>(read: () => Promise<T>, empty: T, key: string | null): T {
  const [v, setV] = useState<T>(empty);
  useEffect(() => {
    if (key === null) return;
    let live = true;
    void read().then((x) => live && setV(x));
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` names the read
  }, [key]);
  return v;
}
const none: never[] = [];
/** `enabled` false = no request (screens that only sometimes show the fields). */
export const useCourses = (enabled = true) => useRead(readCourses, none as HealthCourse[], enabled ? 'courses' : null);
export const useGoals = (course?: string | null) => useRead(() => readGoals(course ?? undefined), none as StudyGoal[], course ?? '*');

/** Tests only. */
export const resetReference = () => { courses = null; goals.clear(); };
