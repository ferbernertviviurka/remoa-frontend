import type {QuestionValidation} from '@remoa/contracts';
import {Tag} from '@remoa/ui';
import {t} from './labels';

/** D-1819. Institutional seal: never CRM, never "revisão médica". medical_review keeps its reviewer (rendered by the caller). */
export const isInstitutional=(v?:QuestionValidation|null)=>v?.kind==='remoa_institutional';
export function ValidationSeal(){
 return <Tag tone="steady"><svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true" className="mr-1 shrink-0"><path d="M2.5 7.5l3 3 6-6.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>{t('questions.validatedRemoa')}</Tag>;
}
