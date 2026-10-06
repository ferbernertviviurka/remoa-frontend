import { AI_DRAFT_SOURCE } from '@remoa/contracts';
import { withStrings } from '@remoa/strings';
import * as more from '@remoa/strings/ns';

const t = withStrings({ inspector: more.inspector });

/** An AI draft is not a reviewed fact. A card the student wrote stays unmarked. */
export function showsAiDraftTag(card: { status: string; source: string | null }): boolean {
  return card.status === 'draft' && card.source === AI_DRAFT_SOURCE;
}

export function AiDraftTag({ card }: { card: { status: string; source: string | null } }) {
  if (!showsAiDraftTag(card)) return null;
  return (
    <p className="m-0 w-fit rounded-pill bg-primary-tint px-2.5 py-1 text-xs font-bold text-primary-deep" data-testid="ai-draft-tag">
      {t('inspector.aiDraft')}
    </p>
  );
}
