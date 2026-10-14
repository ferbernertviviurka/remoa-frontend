import { studyProfileInputSchema, type StudyProfileInput } from '@remoa/contracts';
import { withStrings } from '@remoa/strings';
import * as more from '@remoa/strings/ns';
import { toInput, type StudyDraft, type StudyErrors } from './autofill';

const t = withStrings({ studyProfile: more.studyProfile });

const issueField: Record<string, keyof StudyErrors> = {
  situation: 'situation', course: 'course', courseOtherText: 'courseOther', nonHealthTopic: 'nonHealth', goals: 'goals', customGoals: 'goals', uf: 'uf', city: 'city', councilNumber: 'councilNumber',
};
const message: Record<keyof StudyErrors, Parameters<typeof t>[0]> = {
  situation: 'studyProfile.errors.situation', course: 'studyProfile.errors.course', courseOther: 'studyProfile.errors.courseOther', nonHealth: 'studyProfile.errors.nonHealth',
  goals: 'studyProfile.errors.goals', uf: 'studyProfile.errors.uf', city: 'studyProfile.errors.city', councilNumber: 'studyProfile.errors.councilNumber',
};

/** FR-9: course and at least one focus; the contract schema is the single rule set. */
export function validateDraft(d: StudyDraft, context: 'signup' | 'profile' = 'profile'): { errors: StudyErrors; input: StudyProfileInput | null } {
  if (!d.course) return { errors: { course: t(message.course), ...(d.goals.length + d.customGoals.length ? {} : { goals: t(message.goals) }) }, input: null };
  const input = toInput(d, context);
  const p = studyProfileInputSchema.safeParse(input);
  if (p.success) return { errors: {}, input };
  const errors: StudyErrors = {};
  for (const i of p.error.issues) {
    const f = issueField[String(i.path[0])] ?? 'course';
    errors[f] ??= t(message[f]);
  }
  return { errors, input: null };
}

