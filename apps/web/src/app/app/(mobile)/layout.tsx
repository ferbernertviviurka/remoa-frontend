import type { ReactNode } from 'react';
import { requireCompleteProfile } from '@/lib/profile-guard';

export default async function Layout({ children }: { children: ReactNode }) {
  await requireCompleteProfile(); // G20
  return <main className="mx-auto max-w-md p-4">{children}</main>;
}
