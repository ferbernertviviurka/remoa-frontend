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
  return <div className="basis-full min-w-0 space-y-1 text-sm text-muted">
    <p>{t('questions.teamProfession', { name: t(`questions.teamProfessions.${disclosure.professionCode}`) })}</p>
    <p>{t('questions.teamRightsPending')}</p>
    {disclosure.flags.map(flag => <p key={flag}>{t(`questions.teamFlags.${flag}`)}</p>)}
    {disclosure.explanationStatus === 'absent' ? <p>{t('questions.teamExplanationAbsent')}</p> : null}
  </div>;
}
