import type { StudyDraft } from './autofill';

/** D-1864: the blank draft without autofill's strings, so pages that only need the initial state stay light (onboarding). */
export const emptyDraft: StudyDraft = {
  situation: 'graduacao', course: null, courseLabel: '', council: null, courseOtherText: '', nonHealthTopic: '',
  institution: null, institutionText: '', city: '', uf: '', period: 1, goals: [], customGoals: [], autoGoal: null, councilNumber: '',
};
