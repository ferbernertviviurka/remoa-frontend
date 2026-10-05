import { adminErrors, ADMIN_LIMITS } from '@remoa/contracts';

/** The API answers a stale sign-in as `{ code: 'forbidden', message: 'reauth_required' }` (FR-11, adminErrors.reauth). */
export const isReauth = (error: { code: string; message?: string }) => error.code === 'forbidden' && error.message === adminErrors.reauth;

/** Error code the views switch on: the real `code`, except a reauth that becomes `reauth_required`. */
export const errorCode = (error: { code: string; message?: string }) => (isReauth(error) ? adminErrors.reauth : error.code);

/** FR-11: the 12 h admin session (since the last real sign-in) is over. */
export const sessionExpired = (authenticatedAt: Date | string, now = Date.now()) => now - new Date(authenticatedAt).getTime() > ADMIN_LIMITS.sessionHours * 3_600_000;
