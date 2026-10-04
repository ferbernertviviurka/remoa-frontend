import type { ReactNode } from 'react';
import { ChallengeProvider } from '@/features/challenge/provider';
import { SupportLauncher } from '@/features/support';
import { AppShell } from '@/features/shell/app-shell';

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <ChallengeProvider>
      <AppShell>{children}</AppShell>
      <SupportLauncher />
    </ChallengeProvider>
  );
}
