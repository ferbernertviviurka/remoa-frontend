import type { Entitlements } from '@remoa/contracts';

const DAY = 86_400_000;

export type FreePro = { kind: 'trial' | 'gift'; until: Date; days: number };

/**
 * D-1213: Pro with no subscription behind it (the sign-up trial, or referral/support months). The API sends `grantUntil` only then,
 * so there is no Stripe portal to open and the user can still buy. `trial` while the trial is what ends the Pro; `gift` once a
 * referral/support month runs or is queued after it. `days` rounds up, so the last day reads "Falta 1 dia".
 */
export function freeProOf(e: Pick<Entitlements, 'grantUntil' | 'trialUntil'> | null | undefined, now = new Date()): FreePro | null {
  if (!e?.grantUntil) return null;
  const until = new Date(e.grantUntil);
  const trial = e.trialUntil != null && new Date(e.trialUntil).getTime() >= until.getTime();
  return { kind: trial ? 'trial' : 'gift', until, days: Math.max(1, Math.ceil((until.getTime() - now.getTime()) / DAY)) };
}
