import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { missingRequiredProfile, type AccountSnapshot } from '@remoa/contracts';
import { serverApi } from '@/lib/api/server';
import { safeNext } from '@/lib/safe-next';

/** G20 (D-844): name, phone and userType are required before using /app. The middleware forwards the current path in `x-remoa-path`. An API failure never traps the user. */
export async function requireCompleteProfile(): Promise<void> {
  const me = await serverApi<AccountSnapshot>('/v1/account/me').catch(() => null);
  if (!me?.ok || missingRequiredProfile(me.data.profile).length === 0) return;
  const here = safeNext((await headers()).get('x-remoa-path'));
  redirect(`/app/onboarding?next=${encodeURIComponent(here)}`);
}
