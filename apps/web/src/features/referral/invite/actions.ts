'use server';

import { cookies } from 'next/headers';
import { REFERRAL_COOKIE, REFERRAL_COOKIE_OPTIONS, attribute, lookupInvite } from './attribution';
import { createClient } from '@/lib/supabase/server';

/** Called by `/i/[code]` on mount: re-validates on the server and only then writes `rf`. First touch wins: an existing `rf` is kept (D-383). */
export async function claimInvite(code: string): Promise<{ valid: boolean }> {
  const invite = await lookupInvite(code);
  if (!invite.valid) return { valid: false };
  const jar = await cookies();
  if (!jar.get(REFERRAL_COOKIE)) jar.set(REFERRAL_COOKIE, invite.code, REFERRAL_COOKIE_OPTIONS);
  return { valid: true };
}

/** After an e-mail sign-up that already has a session: attributes with the `rf` cookie, then clears it. */
export async function attributeReferral(): Promise<{ attributed: boolean }> {
  const jar = await cookies();
  const code = jar.get(REFERRAL_COOKIE)?.value;
  if (!code) return { attributed: false };
  const { data } = await (await createClient()).auth.getSession();
  const r = await attribute(code, data.session?.access_token ?? null);
  if (r.done) jar.delete(REFERRAL_COOKIE);
  return { attributed: r.attributed };
}
