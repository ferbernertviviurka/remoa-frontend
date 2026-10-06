import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import type { OnboardingState } from '@remoa/contracts';
import { ChallengeProvider } from '@/features/challenge/provider';
import { SupportLauncher } from '@/features/support';
import { AppShell, prefetchShell } from '@/features/shell/app-shell';
import { serverApi } from '@/lib/api/server';
import { requireCompleteProfile } from '@/lib/profile-guard';

export default async function Layout({ children }: { children: ReactNode }) {
  // F12 FR-4: new accounts go through the onboarding once (it is skippable). An API failure never traps the user: no redirect.
  // The onboarding page lives in (fullscreen), outside this layout, and editorial/admin pages are other route groups.
  // D-995 (P-443c): one wave, not three. /me (guard), /onboarding and the shell's own GETs go out together; serverApi dedupes GETs per
  // render, so AppShell reuses these promises instead of starting a second wave after the layout resolves.
  const onboarding = serverApi<OnboardingState>('/v1/onboarding').catch(() => null);
  void prefetchShell();
  await requireCompleteProfile(); // G20: accounts without name/phone/userType finish "Conte quem você é" first, then come back here
  const ob = await onboarding;
  if (ob?.ok && !ob.data.doneAt) redirect('/app/onboarding');
  return (
    <ChallengeProvider>
      <AppShell>{children}</AppShell>
      <SupportLauncher />
    </ChallengeProvider>
  );
}
