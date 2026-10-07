import { challengeConfigSchema, type AiChallengeSessionPublic, type ChallengeConfig, type Result } from '@remoa/contracts';
import { api } from '@/lib/api';

/** FR-8: the start response carries how many questions were asked and how many did not come back. Numbers only. */
export type GenerationNotice = { requested: number; shortfall: number; stoppedBy: 'quota' | 'ai_error' | null };

const SHORTFALL_PREFIX = 'remoa:challenge-ai-shortfall:';

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Reads `generation` from the start body. A shortfall of zero, or a shape that does not fit, is ignored. */
export function readGenerationNotice(body: unknown): GenerationNotice | null {
  if (!isRecord(body) || !isRecord(body.generation)) return null;
  const { requested, shortfall, stoppedBy } = body.generation;
  if (typeof requested !== 'number' || !Number.isInteger(requested) || requested < 0) return null;
  if (typeof shortfall !== 'number' || !Number.isInteger(shortfall) || shortfall <= 0 || shortfall > requested) return null;
  if (stoppedBy !== null && stoppedBy !== 'quota' && stoppedBy !== 'ai_error') return null;
  return { requested, shortfall, stoppedBy };
}

export function rememberGenerationNotice(sessionId: string, notice: GenerationNotice) {
  if (notice.shortfall <= 0) return;
  try {
    sessionStorage.setItem(SHORTFALL_PREFIX + sessionId, JSON.stringify(notice));
  } catch {
    // private mode: the session still starts, without the notice
  }
}

export function readStoredGenerationNotice(sessionId: string): GenerationNotice | null {
  try {
    const raw = sessionStorage.getItem(SHORTFALL_PREFIX + sessionId);
    return raw ? readGenerationNotice({ generation: JSON.parse(raw) as unknown }) : null;
  } catch {
    return null;
  }
}

/**
 * F32 (G25): starts an AI challenge. This is NOT the old POST /v1/challenge/sessions (that one rejects gradingMode `ai`);
 * the body is validated with the same schema the API uses, so a bad config never leaves the browser.
 * Network failures come back as `{ ok: false }` so the dialog can show an error instead of throwing.
 */
export async function startAiChallenge(config: ChallengeConfig): Promise<Result<AiChallengeSessionPublic> & { generation?: GenerationNotice }> {
  const parsed = challengeConfigSchema.safeParse(config);
  if (!parsed.success) return { ok: false, error: { code: 'validation', message: 'invalid_config' } };
  try {
    const r = await api<AiChallengeSessionPublic>('/v1/challenge-ai/sessions', { method: 'POST', body: JSON.stringify(parsed.data) });
    if (!r.ok) return r;
    const generation = readGenerationNotice(r);
    return generation ? { ...r, generation } : r;
  } catch {
    return { ok: false, error: { code: 'internal', message: 'network' } };
  }
}

/** Where the AI session screen lives (T7). */
export const aiChallengeHref = (boardId: string, sessionId: string) => `/app/mapas/${encodeURIComponent(boardId)}/desafio-ia?session=${encodeURIComponent(sessionId)}`;

/**
 * FR-4 cost line before the start: how many AI gradings the session may use. Only free text goes to the model (discursive questions,
 * and in the "map" format every card item is counted as the worst case). Objective, order and occlusion items are graded in code.
 * `mixed` generated sets are estimated at half the items; the server's `aiUnits` is the exact number once the session exists.
 */
export function aiCostUnits(format: ChallengeConfig['format'], n: number, questionType: 'discursive' | 'objective' | 'mixed'): number {
  if (format === 'map') return n;
  if (questionType === 'discursive') return n;
  if (questionType === 'objective') return 0;
  return Math.ceil(n / 2);
}
