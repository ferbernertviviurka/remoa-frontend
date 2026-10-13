import type {QuestionFeatureFlags} from '@remoa/contracts';
export const disabledQuestionFeatures:QuestionFeatureFlags={import:false,catalog:false,sessions:false};
/** True only while the first authenticated read is pending (the hook's initial object); a failed read returns a fresh disabled copy. */
export const questionFlagsPending=(flags:QuestionFeatureFlags)=>flags===disabledQuestionFeatures;
