import { challengeConfigSchema, type AiChallengeSessionPublic, type ChallengeConfig, type Result } from '@remoa/contracts';
import { api } from '@/lib/api';

/**
 * F32 (G25): starts an AI challenge. This is NOT the old POST /v1/challenge/sessions (that one rejects gradingMode `ai`);
 * the body is validated with the same schema the API uses, so a bad config never leaves the browser.
 * Network failures come back as `{ ok: false }` so the dialog can show an error instead of throwing.
 */
export async function startAiChallenge(config: ChallengeConfig): Promise<Result<AiChallengeSessionPublic>> {
  const parsed = challengeConfigSchema.safeParse(config);
  if (!parsed.success) return { ok: false, error: { code: 'validation', message: 'invalid_config' } };
  try {
    return await api<AiChallengeSessionPublic>('/v1/challenge-ai/sessions', { method: 'POST', body: JSON.stringify(parsed.data) });
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
