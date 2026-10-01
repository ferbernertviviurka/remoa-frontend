// Editor state per card type ⇄ SaveCardInput. Pure, so the save rules are unit-tested without React.
import {
  caseStages, saveCardInputSchema,
  type CardDetail, type CardMask, type CardPreview, type CaseStage, type FlowStep, type SaveCardInput,
} from '@remoa/contracts';
import { t, type StringKey } from '@remoa/strings';

type Base = { id: string; title: string; front: string; back: string; source: string };
export type Draft = Base &
  (
    | { type: 'concept' }
    | { type: 'flow'; steps: FlowStep[] }
    | { type: 'case'; stages: Record<CaseStage, string> }
    | { type: 'image'; assetId: string | null; masks: CardMask[] }
  );

export const newStep = (): FlowStep => ({ id: crypto.randomUUID(), text: '' });
const emptyStages = (): Record<CaseStage, string> => ({ presentation: '', workup: '', diagnosis: '', management: '' });

/**
 * Detail from GET /v1/cards/:id → editable draft. A card born from a map op stores `{}` whatever its type,
 * and the API returns it unvalidated, so every payload field is read defensively (new card = defaults).
 */
export function toDraft(card: Pick<CardDetail, 'id' | 'type' | 'title' | 'front' | 'back' | 'source'> & { payload: unknown }): Draft {
  const base: Base = { id: card.id, title: card.title, front: card.front ?? '', back: card.back ?? '', source: card.source ?? '' };
  const p = (card.payload ?? {}) as { steps?: unknown; caseSteps?: unknown; assetId?: unknown; masks?: unknown };
  switch (card.type) {
    case 'concept':
      return { ...base, type: 'concept' };
    case 'flow': {
      const steps = Array.isArray(p.steps) ? (p.steps as FlowStep[]).filter((s) => s && typeof s.id === 'string') : [];
      while (steps.length < 2) steps.push(newStep());
      return { ...base, type: 'flow', steps: steps.map((s) => ({ id: s.id, text: s.text ?? '', ...(s.note ? { note: s.note } : {}) })) };
    }
    case 'case': {
      const stages = emptyStages();
      if (Array.isArray(p.caseSteps))
        for (const s of p.caseSteps as { stage?: string; text?: string }[])
          if (caseStages.includes(s?.stage as CaseStage)) stages[s.stage as CaseStage] = s.text ?? '';
      return { ...base, type: 'case', stages };
    }
    case 'image':
      return {
        ...base,
        type: 'image',
        assetId: typeof p.assetId === 'string' ? p.assetId : null,
        masks: Array.isArray(p.masks) ? (p.masks as CardMask[]) : [],
      };
  }
}

const orNull = (s: string) => (s.trim() ? s.trim() : null);

/** Draft → request body (empty texts become null, empty case stages and notes are omitted). Not validated. */
export function toInput(d: Draft): unknown {
  const base = { type: d.type, title: d.title.trim(), front: orNull(d.front), back: orNull(d.back), source: orNull(d.source) };
  switch (d.type) {
    case 'concept':
      return { ...base, payload: {} };
    case 'flow':
      return {
        ...base,
        payload: { steps: d.steps.map((s) => ({ id: s.id, text: s.text.trim(), ...(s.note?.trim() ? { note: s.note.trim() } : {}) })) },
      };
    case 'case':
      return {
        ...base,
        payload: { caseSteps: caseStages.flatMap((stage) => (d.stages[stage].trim() ? [{ stage, text: d.stages[stage].trim() }] : [])) },
      };
    case 'image':
      return { ...base, payload: { assetId: d.assetId, masks: d.masks.map((m) => ({ ...m, label: m.label.trim() })) } };
  }
}

/** Zod issue path → user message. The first matching prefix wins. */
const messages: [RegExp, StringKey][] = [
  [/^title/, 'cards.errors.title'],
  [/^payload\.steps\.\d+\.text/, 'cards.errors.stepText'],
  [/^payload\.steps/, 'cards.errors.steps'],
  [/^payload\.caseSteps/, 'cards.errors.caseMin'],
  [/^payload\.assetId/, 'cards.errors.image'],
  [/^payload\.masks\.\d+\.label/, 'cards.errors.maskLabel'],
];

export type Built = { ok: true; data: SaveCardInput } | { ok: false; errors: string[] };

/** FR-8: validates client-side with the same schema as the API; invalid input never leaves the browser. */
export function buildSaveInput(d: Draft): Built {
  const r = saveCardInputSchema.safeParse(toInput(d));
  if (r.success) return { ok: true, data: r.data };
  const errors = r.error.issues.map((i) => {
    const path = i.path.join('.');
    const hit = messages.find(([re]) => re.test(path));
    return t(hit ? hit[1] : i.code === 'too_big' ? 'cards.errors.tooLong' : 'errors.validation');
  });
  return { ok: false, errors: [...new Set(errors)] };
}

/** Map-card preview after a save (same shape the API fills in GET /v1/boards/:id). */
export function previewOf(input: SaveCardInput): CardPreview | undefined {
  switch (input.type) {
    case 'flow':
      return { steps: input.payload.steps.length };
    case 'case':
      return { stages: input.payload.caseSteps.map((s) => s.stage) };
    case 'image':
      return { masks: input.payload.masks.length, assetId: input.payload.assetId };
    default:
      return undefined;
  }
}
