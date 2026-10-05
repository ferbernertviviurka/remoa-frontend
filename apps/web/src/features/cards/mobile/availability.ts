import type { Entitlements } from '@remoa/contracts';
import type { CreateCardAvailability, CreateCardKind } from '@remoa/ui';
import { t } from '@remoa/strings';

const left = (limit: number | null, used: number) => (limit === null ? null : Math.max(0, limit - used));

/**
 * D-668: per-option availability from `Entitlements` (limits come from `planDefinition`, never fixed here).
 * `null` limit = unlimited; `entitlements === null` (request failed) = no counts, nothing blocked (the API still enforces).
 */
export function createAvailability(e: Entitlements | null): Partial<Record<CreateCardKind, CreateCardAvailability>> {
  if (!e) return {};
  const cards = left(e.limits.cards, e.usage.cards);
  const ai = left(e.limits.ai_generations, e.usage.ai_generations);
  const cardsOut: CreateCardAvailability = cards === 0 ? { status: 'limit' } : {};
  const gen = (key: 'ai' | 'pdf'): CreateCardAvailability => {
    if (e.limits.ai_generations === 0) return { status: 'pro' }; // not included in the plan (Free)
    if (ai === null) return key === 'ai' ? { hint: t('mapMobile.createSheet.options.ai.subPro') } : {};
    const hint = t(key === 'ai' ? 'mapMobile.createSheet.options.ai.subFree' : 'mapMobile.createSheet.options.pdf.subFree', { n: ai });
    return ai === 0 ? { status: 'limit', hint } : { hint };
  };
  const anki: CreateCardAvailability = e.ankiImports !== null && e.ankiImportsUsed >= e.ankiImports ? { status: 'limit' } : {};
  return { anki, concept: cardsOut, flowchart: cardsOut, case: cardsOut, image: cardsOut, photo: cardsOut, ai: gen('ai'), pdf: gen('pdf') };
}

/** Paywall reason (F15) for a blocked option. */
export const blockedReason = (kind: CreateCardKind) => (kind === 'ai' ? 'ai_quota' : kind === 'pdf' ? 'pdf' : kind === 'anki' ? 'anki' : 'cards') as 'ai_quota' | 'pdf' | 'anki' | 'cards';
