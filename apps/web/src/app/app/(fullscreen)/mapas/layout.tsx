import type { ReactNode } from 'react';
import { requireCompleteProfile } from '@/lib/profile-guard';

// G20: the editor lives outside the (app) layout; it needs the same guard (the onboarding is a sibling, so no loop).
export default async function Layout({ children }: { children: ReactNode }) {
  await requireCompleteProfile();
  return children;
}
