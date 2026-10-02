import { apiFetch } from '@/lib/api';
import type { Segment } from '@remoa/contracts';

/** UI order (3 options in `landing.waitlist.segment.options`) -> contracts `segments`. */
export const WAITLIST_SEGMENTS: readonly Segment[] = ['y3_4', 'y5_6', 'graduated'];

export type WaitlistOutcome = { kind: 'ok' | 'invalid' | 'error' } | { kind: 'rate_limited'; message: string };

/** POST /v1/public/waitlist (no token). 200 -> ok, 422 -> invalid, 429 -> rate_limited, network/5xx -> error. */
export async function postWaitlist(body: { email: string; segment: Segment; variant: string | null; honeypot: string }): Promise<WaitlistOutcome> {
  try {
    const r = await apiFetch('/v1/public/waitlist', null, {
      method: 'POST',
      body: JSON.stringify({ email: body.email, segment: body.segment, variant: body.variant, origin: 'landing', website: body.honeypot }),
    });
    if (r.ok) return { kind: 'ok' };
    if (r.error.code === 'validation') return { kind: 'invalid' };
    if (r.error.code === 'rate_limited') return { kind: 'rate_limited', message: r.error.message }; // pt-BR text from the API (no landing.* string for it yet)
    return { kind: 'error' };
  } catch {
    return { kind: 'error' };
  }
}
