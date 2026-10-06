/** Shape the API lane returns next to an AI result (G22). TODO(CCR): replace with the @remoa/contracts type when it lands. */
export type AiMeta = { status: 'ok' | 'fallback' | 'error'; code: string | null; message: string | null };
/** `remaining`: uses left in the period; `warn80`: 80% of the limit used. */
export type AiUsage = { remaining?: number | null; warn80?: boolean };
/** Optional AI fields on a grading answer. */
export type AiExtra = { ai?: AiMeta; gradeId?: string; sourceQuote?: string | null } & AiUsage;

const LIMIT_CODES = ['quota', 'quota_exceeded', 'rate_limited'];
export const isLimit = (ai?: AiMeta | null, u?: AiUsage) => (ai ? LIMIT_CODES.includes(ai.code ?? '') : false) || u?.remaining === 0;
