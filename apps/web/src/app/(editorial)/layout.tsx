import type { ReactNode } from 'react';
import { requireRole } from '@/server/auth/session';

export default async function Layout({ children }: { children: ReactNode }) {
  await requireRole(['reviewer', 'admin']);
  return <main className="mx-auto max-w-3xl p-6">{children}</main>;
}
