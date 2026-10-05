import { REFERRAL_COOKIE, REFERRAL_LIMITS, normalizeReferralCode, type AttributionResult, type ReferralInvitePublic } from '@remoa/contracts';
import { headers } from 'next/headers';
import { apiFetch } from '@/lib/api';
import { clientIpHeaders } from '@/lib/api/client-ip';

export const REFERRAL_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: REFERRAL_LIMITS.cookieDays * 86_400,
};
export { REFERRAL_COOKIE };

/**
 * D-399: these calls run on the Next server, so without this the API sees one IP for every visitor: the 30/min public lookup
 * limit becomes global (invite pages turn "invalid" and lose the cookie under a WhatsApp burst) and every attribution looks
 * like the same IP + user agent to the weak fraud signal. The IP goes as the trusted pair (D-537), same as the F17 unlock action.
 */
async function visitor(): Promise<Record<string, string>> {
  let ua: string | null = null;
  try {
    ua = (await headers()).get('user-agent');
  } catch {
    // outside a request (tests)
  }
  return { ...(await clientIpHeaders()), ...(ua ? { 'user-agent': ua } : {}) };
}

/** GET /v1/public/referral/:code. Any failure (malformed, unknown, API down) is "invalid": the page falls back to the neutral version. */
export async function lookupInvite(raw: string): Promise<ReferralInvitePublic> {
  const code = normalizeReferralCode(raw);
  if (!code) return { valid: false };
  const r = await apiFetch<ReferralInvitePublic>(`/v1/public/referral/${code}`, null, { headers: await visitor() }).catch(() => null);
  return r?.ok ? r.data : { valid: false };
}

/**
 * POST /v1/referral/attribution (D-383). Never throws and never blocks the sign-up: `done` is true when the server answered
 * (the caller then clears the cookie); a network failure keeps it so a later sign-in can still try.
 */
export async function attribute(raw: string | null | undefined, token: string | null): Promise<{ attributed: boolean; done: boolean }> {
  const code = raw ? normalizeReferralCode(raw) : null;
  if (!code || !token) return { attributed: false, done: false };
  const r = await apiFetch<AttributionResult>('/v1/referral/attribution', token, { method: 'POST', body: JSON.stringify({ code }), headers: await visitor() }).catch(() => null);
  return { attributed: !!r?.ok && r.data.attributed, done: r !== null };
}
