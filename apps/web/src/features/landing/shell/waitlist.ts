import { apiBase } from '@/lib/api/base';
import type { Segment } from '@remoa/contracts';

/** UI order (3 options in `landing.waitlist.segment.options`) -> contracts `segments`. */
export const WAITLIST_SEGMENTS: readonly Segment[] = ['y3_4', 'y5_6', 'graduated'];

export type WaitlistOutcome = { kind: 'ok' | 'invalid' | 'error' } | { kind: 'rate_limited'; message: string };

/** POST /v1/public/waitlist (no token). 200 -> ok, 422 -> invalid, 429 -> rate_limited, network/5xx -> error. */
export async function postWaitlist(body: { email: string; segment: Segment; variant: string | null; honeypot: string }): Promise<WaitlistOutcome> {
  try {
    // D-535: plain fetch (not `apiFetch`), so the landing bundle carries no zod; only `error.code`/`message` are read.
    const res = await fetch(`${apiBase()}/v1/public/waitlist`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: body.email, segment: body.segment, variant: body.variant, origin: 'landing', website: body.honeypot }),
    });
    if (res.ok) return { kind: 'ok' };
    const err = ((await res.json().catch(() => null)) as { error?: { code?: unknown; message?: unknown } } | null)?.error;
    if (err?.code === 'validation') return { kind: 'invalid' };
    if (err?.code === 'rate_limited' && typeof err.message === 'string') return { kind: 'rate_limited', message: err.message }; // pt-BR text from the API (no landing.* string for it yet)
    return { kind: 'error' };
  } catch {
    return { kind: 'error' };
  }
}
