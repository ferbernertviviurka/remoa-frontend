import type { QuestionPublic } from '@remoa/contracts';
import { t } from './labels';

/** Publication permits reading; only eligible items may enter a scored session. */
export const canSelectQuestion = (question: QuestionPublic) => question.teamDisclosure?.resolutionEligible !== false;
/** Signed catalog-only items cannot be answered. Legacy annulled study behavior remains unchanged. */
export const isCatalogOnly = (question: QuestionPublic) => question.teamDisclosure?.resolutionEligible === false;

/** This is an institutional declaration, with provenance and unresolved documentary flags visible before answering. */
export function TeamDisclosure({ question }: { question: QuestionPublic }) {
  const disclosure = question.teamDisclosure;
  if (!disclosure) return null;
  const expiresAt = disclosure.sourceRightsExpiresAt;
  const expired = expiresAt != null && new Date(expiresAt).getTime() <= Date.now();
  const approved = disclosure.sourceRightsStatus === 'authorized' && disclosure.sourceApprovalBasis === 'remoa_admin_attestation';
  const rightsLabel = disclosure.sourceRightsStatus === 'revoked' ? 'questions.teamSourceRevoked'
    : disclosure.sourceRightsStatus === 'restricted' ? 'questions.teamSourceRestricted'
    : approved && expired ? 'questions.teamSourceExpired'
    : approved ? 'questions.teamSourceApproved' : 'questions.teamRightsPending';
  return <div className="basis-full min-w-0 space-y-1 text-sm text-muted">
    <p>{t('questions.teamProfession', { name: t(`questions.teamProfessions.${disclosure.professionCode}`) })}</p>
    {disclosure.sourceAreaCodes?.length ? <>
      <p>{t('questions.teamSourceAreas', { names: disclosure.sourceAreaCodes.map(code => t(`questions.teamSourceAreaLabels.${code}`)).join(', ') })}</p>
      <p>{t('questions.teamClassificationUnreviewed')}</p>
    </> : null}
    {!question.areaId&&!question.classification?.area ? <p>{t('questions.teamAreaUnclassified')}</p> : null}
    {!question.topicId&&!question.classification?.topic ? <p>{t('questions.teamTopicUnclassified')}</p> : null}
    <p>{t(rightsLabel)}</p>
    {approved && !expired && expiresAt ? <p>{t('questions.teamSourceExpires', { date: new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' }).format(new Date(expiresAt)) })}</p> : null}
    {disclosure.flags.map(flag => <p key={flag}>{t(`questions.teamFlags.${flag}`)}</p>)}
    {disclosure.explanationStatus === 'absent' ? <p>{t('questions.teamExplanationAbsent')}</p> : null}
  </div>;
}
