import { withStrings } from '@remoa/strings';
import { questionsAdmin } from '@remoa/strings/ns';
import { QuestionsApiError } from '@/features/questions/api';
export const tq=withStrings({questionsAdmin});
export function adminQuestionError(error:unknown):string{
  if(error instanceof QuestionsApiError){
    if(error.detail==='context_requires_staging_review')return tq('questionsAdmin.contextManagedDraft');
    if(error.detail?.includes('context')&&error.code==='conflict')return tq('questionsAdmin.recoveryConflict');
    if(error.detail==='published_requires_new_version')return tq('questionsAdmin.pageImagePublished');
    if(error.code==='conflict')return tq('questionsAdmin.stale');
    if(error.code==='reauth_required'||error.detail==='reauth_required')return tq('questionsAdmin.reauth');
    if(error.detail==='reviewer_crm_required')return tq('questionsAdmin.crmRequired');
    if(error.detail==='reviewer only'||error.detail==='reviewer_only')return tq('questionsAdmin.reviewerOnly');
    if(['forbidden','not_found','unauthorized'].includes(error.code))return tq('questionsAdmin.accessDenied');
  }
  return tq('questionsAdmin.operationError');
}
