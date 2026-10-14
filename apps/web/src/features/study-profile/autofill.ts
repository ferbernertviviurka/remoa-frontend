import type {
  CouncilCode, HealthCourse, HealthCourseCode, Institution, ReferenceSuggestionInput,
  StudyGoalCode, StudyProfile, StudyProfileInput, StudySituation,
} from '@remoa/contracts';
import { withStrings } from '@remoa/strings';
import * as more from '@remoa/strings/ns';

const t = withStrings({ studyProfile: more.studyProfile });

/** F35 FR-18..FR-22: what the "Seu estudo" form holds while editing (signup, onboarding, Conta). Pure, no React, zod-free (the sign-up's first paint imports it; validation is ./validate). */
export type StudyDraft = {
  situation: StudySituation;
  course: HealthCourseCode | null;
  /** Shown in the course field: the list name, or what the user typed for other_health. */
  courseLabel: string;
  council: CouncilCode | null;
  courseOtherText: string;
  nonHealthTopic: string;
  /** Picked from the list (fills city, UF, type read-only) ... */
  institution: Institution | null;
  /** ... or typed ("Usar o que digitei"): then city and UF are typed too. */
  institutionText: string;
  city: string;
  uf: string;
  period: number;
  goals: StudyGoalCode[];
  customGoals: string[];
  /** The goal the course added by itself ("automático", with Desfazer). Never a goal the user picked. */
  autoGoal: StudyGoalCode | null;
  councilNumber: string;
};

import { emptyDraft } from './draft';
export { emptyDraft };

/** FR-18: the course fills the council and suggests its first goal (automatic). Switching course swaps ONLY the automatic goal. */
export function applyCourse(d: StudyDraft, c: HealthCourse | null, label = c?.name ?? ''): StudyDraft {
  const kept = d.goals.filter((g) => g !== d.autoGoal);
  const suggested = c?.suggestedGoals[0] ?? null;
  const auto = kept.length === 0 && d.customGoals.length === 0 && suggested ? suggested : null;
  return {
    ...d,
    course: c?.code ?? null,
    courseLabel: label,
    council: c?.councilCode ?? null,
    courseOtherText: c?.code === 'other_health' ? (c.name === label ? d.courseOtherText : label) : '',
    nonHealthTopic: c?.code === 'not_health' ? d.nonHealthTopic : '',
    councilNumber: c?.councilCode ? d.councilNumber : '',
    goals: auto ? [...kept, auto] : kept,
    autoGoal: auto,
  };
}

export const undoAutoGoal = (d: StudyDraft): StudyDraft => ({ ...d, goals: d.goals.filter((g) => g !== d.autoGoal), autoGoal: null });

/** Picking or removing a goal by hand; removing the automatic one clears its mark. */
export function toggleGoal(d: StudyDraft, g: StudyGoalCode): StudyDraft {
  const on = d.goals.includes(g);
  return { ...d, goals: on ? d.goals.filter((x) => x !== g) : [...d.goals, g], autoGoal: on && g === d.autoGoal ? null : d.autoGoal };
}

/** FR-19: from the list fills city, UF and type; typed text clears them for the user to type. */
export function applyInstitution(d: StudyDraft, pick: { institution: Institution } | { text: string } | null): StudyDraft {
  if (!pick) return { ...d, institution: null, institutionText: '', city: '', uf: '' };
  if ('institution' in pick) return { ...d, institution: pick.institution, institutionText: '', city: pick.institution.city, uf: pick.institution.uf };
  return { ...d, institution: null, institutionText: pick.text, city: '', uf: '' };
}

const special = (c: HealthCourseCode | null) => c === 'other_health' || c === 'not_health';

/** FR-20..FR-22: which fields the situation and the course show. */
export function visibleFields(d: Pick<StudyDraft, 'situation' | 'course' | 'council' | 'institutionText'>) {
  return {
    period: d.situation === 'graduacao' && !!d.course && !special(d.course),
    councilNumber: d.situation === 'profissional' && !!d.council,
    council: !!d.council,
    courseOther: d.course === 'other_health',
    nonHealthTopic: d.course === 'not_health',
    institutionCustom: !!d.institutionText,
  };
}
type Visible = ReturnType<typeof visibleFields>;

export const courseName = (d: Pick<StudyDraft, 'course' | 'courseLabel' | 'courseOtherText'>) =>
  d.course === 'other_health' && d.courseOtherText.trim() ? d.courseOtherText.trim() : d.courseLabel;

/** FR-21: "Estudante de Enfermagem · 5º período", "Residente ou pós-graduando em Farmácia"... */
export function focusTitle(d: StudyDraft): string {
  if (!d.course) return t('studyProfile.focus.empty');
  if (d.course === 'not_health') {
    const topic = d.nonHealthTopic.trim();
    return topic ? t('studyProfile.focus.nonHealthTopic', { topic }) : t('studyProfile.focus.nonHealth');
  }
  const course = courseName(d);
  if (d.situation === 'graduacao') return visibleFields(d).period ? t('studyProfile.focus.graduacaoPeriod', { course, n: d.period }) : t('studyProfile.focus.graduacao', { course });
  return t(`studyProfile.focus.${d.situation}`, { course });
}

const blank = (s: string) => (s.trim() ? s.trim() : null);

/** Request body with only the fields the situation/course show (the server rejects the others). */
export function toInput(d: StudyDraft, context: 'signup' | 'profile' = 'profile'): StudyProfileInput {
  const v: Visible = visibleFields(d);
  return {
    situation: d.situation,
    course: d.course as HealthCourseCode,
    courseOtherText: v.courseOther ? blank(d.courseOtherText) : null,
    nonHealthTopic: v.nonHealthTopic ? blank(d.nonHealthTopic) : null,
    institutionId: d.institution?.id ?? null,
    institutionText: d.institution ? null : blank(d.institutionText),
    city: d.institution ? null : blank(d.city),
    uf: d.institution ? null : ((blank(d.uf)?.toUpperCase() ?? null) as StudyProfileInput['uf']),
    period: v.period ? d.period : null,
    goals: d.goals,
    customGoals: d.customGoals,
    councilNumber: v.councilNumber ? blank(d.councilNumber) : null,
    context,
  };
}

export type StudyErrors = Partial<Record<'situation' | 'course' | 'courseOther' | 'nonHealth' | 'goals' | 'uf' | 'city' | 'councilNumber', string>>;

/** Saved profile -> form. `courses` gives names and councils; without the list the code stands in. */
export function fromProfile(p: StudyProfile | null, courses: readonly HealthCourse[]): StudyDraft {
  if (!p) return emptyDraft;
  const c = courses.find((x) => x.code === p.course) ?? null;
  return {
    ...emptyDraft,
    situation: p.situation ?? 'graduacao',
    course: p.course,
    courseLabel: p.course === 'other_health' && p.courseOtherText ? p.courseOtherText : (c?.name ?? p.course ?? ''),
    council: c?.councilCode ?? null,
    courseOtherText: p.courseOtherText ?? '',
    nonHealthTopic: p.nonHealthTopic ?? '',
    institution: p.institution,
    institutionText: p.institution ? '' : (p.institutionText ?? ''),
    city: p.institution?.city ?? p.city ?? '',
    uf: p.institution?.uf ?? p.uf ?? '',
    period: p.period ?? 1,
    goals: p.goals,
    customGoals: p.customGoals,
    councilNumber: p.councilNumber ?? '',
  };
}

/** FR-6: free texts go to the curation queue; only the ones that changed, so re-saving does not count twice. Never blocks. */
export function newSuggestions(next: StudyProfileInput, prev: StudyProfile | null): ReferenceSuggestionInput[] {
  const out: ReferenceSuggestionInput[] = [];
  if (next.courseOtherText && next.courseOtherText !== prev?.courseOtherText) out.push({ kind: 'course', text: next.courseOtherText });
  if (next.institutionText && next.institutionText !== prev?.institutionText) out.push({ kind: 'institution', text: next.institutionText });
  for (const g of next.customGoals ?? []) if (!prev?.customGoals.includes(g)) out.push({ kind: 'goal', text: g });
  return out;
}

/** FR-23 "Cadastro de estudo {pct}% completo": situação, curso, instituição e foco (as in the mockup). */
export function studyCompleteness(p: StudyProfile | null): number {
  const done = [!!p?.situation, !!p?.course, !!(p?.institution || p?.institutionText), !!p && p.goals.length + p.customGoals.length > 0];
  return Math.round((done.filter(Boolean).length * 100) / done.length);
}
