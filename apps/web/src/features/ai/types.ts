import type { AiInfo } from '@remoa/contracts';

/** Quota gone (402/429 `quota_exceeded`, or nothing left) vs. too many requests at once (429 `rate_limited`). */
export const isRateLimited = (ai?: AiInfo | null) => ai?.code === 'rate_limited';
export const isLimit = (ai?: AiInfo | null) => ai?.code === 'quota_exceeded' || isRateLimited(ai) || ai?.quota?.remaining === 0;
