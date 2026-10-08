// What a card's back holds, shared by the desktop node (flip) and the phone peek ("Ver resposta", D-1572).
import { caseStages, type Card, type CardDetail, type CaseStage as Stage } from '@remoa/contracts';
import { withStrings } from '@remoa/strings';
import * as more from '@remoa/strings/ns';
import type { CaseStage } from '@remoa/ui';
import type { CardFace } from '@/features/cards/card-face';

const t = withStrings({ cards: more.cards });

/** Whether the card has an answer to show on the back (from what the map already has; the text loads on flip). */
export function hasAnswer(card: Card, face: Pick<CardFace, 'answer'>): boolean {
  const p = card.preview;
  const img = !!card.backAssetId; // D-201: an answer image alone is an answer too
  switch (card.type) {
    case 'concept':
      return !!face.answer || img;
    case 'flow':
      return (p?.steps ?? 0) > 0 || img;
    case 'case':
      return (p?.stages?.length ?? 0) > 0 || img;
    case 'image':
      return (p?.masks ?? 0) > 0;
    case 'note':
      return false; // D-200: Conteúdo has no back
  }
}

/** G06: the four stages of a clinical case, in order, with the tooltip text (what it is, what filling it changes). */
export function caseStageItems(
  filled: readonly string[] | undefined,
  detail: CardDetail | null,
  image?: (assetId: string, stage: string) => CaseStage['image'],
): (CaseStage & { key: Stage })[] {
  // a card born from a map op stores `{}` whatever its type (draft.ts): read the payload defensively
  const steps = detail?.type === 'case' ? (detail.payload.caseSteps ?? []) : undefined;
  return caseStages.map((key) => {
    const s = steps?.find((x) => x.stage === key);
    const label = t(`cards.case.stage.${key}`);
    return {
      key, label, hint: t(`cards.case.hint.${key}`), text: s?.text, filled: steps ? !!s : !!filled?.includes(key),
      ...(s?.assetId && image ? { image: image(s.assetId, label) } : {}),
    };
  });
}
