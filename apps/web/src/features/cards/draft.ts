// Editor state per card type ⇄ SaveCardInput. Pure, so the save rules are unit-tested without React.
import {
  caseStages, saveCardInputSchema,
  type CardDetail, type CardMask, type CardPreview, type CardShape, type CaseStage, type FlowStep, type SaveCardInput,
} from '@remoa/contracts';
import { withStrings } from '@remoa/strings';
import * as more from '@remoa/strings/ns';

const t = withStrings({ cards: more.cards });
type StringKey = Parameters<typeof t>[0];

/**
 * `shape` (D-095, concept only), `frontAssetId` (D-096, question image) and `backAssetId` (D-201, answer image; not on
 * image/note cards) are common to every type.
 */
type Base = { id: string; title: string; front: string; back: string; source: string; shape: CardShape; frontAssetId: string | null; backAssetId: string | null };
export type Draft = Base &
  (
    | { type: 'concept' }
    | { type: 'flow'; steps: FlowStep[] }
    | { type: 'case'; stages: Record<CaseStage, string>; /** D-201: image per stage */ stageAssets: Record<CaseStage, string | null> }
    | { type: 'image'; assetId: string | null; masks: CardMask[] }
    /** D-200: "Conteúdo", informative only: title, text (`front`) and image; no back. */
    | { type: 'note' }
  );

export const newStep = (): FlowStep => ({ id: crypto.randomUUID(), text: '' });
const emptyStages = (): Record<CaseStage, string> => ({ presentation: '', workup: '', diagnosis: '', management: '' });
const noAssets = (): Record<CaseStage, string | null> => ({ presentation: null, workup: null, diagnosis: null, management: null });
const idOf = (v: unknown) => (typeof v === 'string' && v ? v : undefined);

/**
 * Detail from GET /v1/cards/:id → editable draft. A card born from a map op stores `{}` whatever its type,
 * and the API returns it unvalidated, so every payload field is read defensively (new card = defaults).
 */
export function toDraft(
  card: Pick<CardDetail, 'id' | 'type' | 'title' | 'front' | 'back' | 'source'> & Partial<Pick<CardDetail, 'shape' | 'frontAssetId' | 'backAssetId'>> & { payload: unknown },
): Draft {
  const base: Base = {
    id: card.id, title: card.title, front: card.front ?? '', back: card.back ?? '', source: card.source ?? '',
    shape: card.type === 'concept' ? (card.shape ?? 'rect') : 'rect', frontAssetId: card.frontAssetId ?? null,
    backAssetId: card.type === 'note' || card.type === 'image' ? null : (card.backAssetId ?? null),
  };
  const p = (card.payload ?? {}) as { steps?: unknown; caseSteps?: unknown; assetId?: unknown; masks?: unknown };
  switch (card.type) {
    case 'concept':
      return { ...base, type: 'concept' };
    case 'flow': {
      const steps = Array.isArray(p.steps) ? (p.steps as FlowStep[]).filter((s) => s && typeof s.id === 'string') : [];
      while (steps.length < 2) steps.push(newStep());
      return {
        ...base,
        type: 'flow',
        steps: steps.map((s) => ({ id: s.id, text: s.text ?? '', ...(s.note ? { note: s.note } : {}), ...(idOf(s.assetId) ? { assetId: s.assetId } : {}) })),
      };
    }
    case 'case': {
      const stages = emptyStages();
      const stageAssets = noAssets();
      if (Array.isArray(p.caseSteps))
        for (const s of p.caseSteps as { stage?: string; text?: string; assetId?: unknown }[])
          if (caseStages.includes(s?.stage as CaseStage)) {
            stages[s.stage as CaseStage] = s.text ?? '';
            stageAssets[s.stage as CaseStage] = idOf(s.assetId) ?? null;
          }
      return { ...base, type: 'case', stages, stageAssets };
    }
    case 'image':
      return {
        ...base,
        type: 'image',
        assetId: typeof p.assetId === 'string' ? p.assetId : null,
        masks: Array.isArray(p.masks) ? (p.masks as CardMask[]) : [],
      };
    case 'note':
      return { ...base, type: 'note', back: '' };
  }
}

const orNull = (s: string) => (s.trim() ? s.trim() : null);

/** Draft → request body (empty texts become null, empty case stages and notes are omitted). Not validated. */
export function toInput(d: Draft): unknown {
  const base = {
    type: d.type, title: d.title.trim(), front: orNull(d.front), back: d.type === 'note' ? null : orNull(d.back), source: orNull(d.source),
    shape: d.type === 'concept' ? d.shape : 'rect', frontAssetId: d.frontAssetId,
    backAssetId: d.type === 'note' || d.type === 'image' ? null : d.backAssetId,
  };
  switch (d.type) {
    case 'concept':
      return { ...base, payload: {} };
    case 'flow':
      return {
        ...base,
        payload: {
          steps: d.steps.map((s) => ({ id: s.id, text: s.text.trim(), ...(s.note?.trim() ? { note: s.note.trim() } : {}), ...(s.assetId ? { assetId: s.assetId } : {}) })),
        },
      };
    case 'case':
      return {
        ...base,
        // a stage needs its text (the contract): an image on an empty stage is dropped with it
        payload: {
          caseSteps: caseStages.flatMap((stage) => {
            const text = d.stages[stage].trim();
            const assetId = d.stageAssets[stage];
            return text ? [{ stage, text, ...(assetId ? { assetId } : {}) }] : [];
          }),
        },
      };
    case 'image':
      return { ...base, payload: { assetId: d.assetId, masks: d.masks.map((m) => ({ ...m, label: m.label.trim() })) } };
    case 'note':
      return { ...base, payload: {} };
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
  if (d.title.trim().length === 1) return { ok: false, errors: [t('cards.errors.title')] }; // F23 FR-14: at least 2 characters (the contract only asks for 1, P-287)
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
