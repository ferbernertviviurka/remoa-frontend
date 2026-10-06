import type { AppError, ErrorCode } from '@remoa/contracts';

// P-507 (D-1070): same check as `httpErrorBodySchema` (contracts), without zod in every page's initial JS. The API is the one that
// validates; here we only read its error body. `Record<ErrorCode, true>` fails the typecheck if the contract's code list changes.
const CODES: Record<ErrorCode, true> = {
  unauthorized: true,
  forbidden: true,
  not_found: true,
  validation: true,
  quota_exceeded: true,
  rate_limited: true,
  conflict: true,
  ai_unavailable: true,
  internal: true,
};

/** `{ error: { code, message } }` -> the AppError (extra fields dropped), or null when the body is not an API error. */
export function readErrorBody(body: unknown): AppError | null {
  const error = (body as { error?: unknown } | null)?.error;
  if (!error || typeof error !== 'object') return null;
  const { code, message } = error as Record<string, unknown>;
  return typeof code === 'string' && Object.hasOwn(CODES, code) && typeof message === 'string' ? { code: code as ErrorCode, message } : null;
}
