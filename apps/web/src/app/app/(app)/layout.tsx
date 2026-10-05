import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import type { OnboardingState } from '@remoa/contracts';
import { ChallengeProvider } from '@/features/challenge/provider';
import { SupportLauncher } from '@/features/support';
import { AppShell } from '@/features/shell/app-shell';
import { serverApi } from '@/lib/api/server';

export default async function Layout({ children }: { children: ReactNode }) {
  // F12 FR-4: new accounts go through the onboarding once (it is skippable). An API failure never traps the user: no redirect.
  // The onboarding page lives in (fullscreen), outside this layout, and editorial/admin pages are other route groups.
  const ob = await serverApi<OnboardingState>('/v1/onboarding').catch(() => null);
  if (ob?.ok && !ob.data.doneAt) redirect('/app/onboarding');
  return (
    <ChallengeProvider>
      <AppShell>{children}</AppShell>
      <SupportLauncher />
    </ChallengeProvider>
  );
}
