import type { ReactNode } from 'react';
import { requireRole } from '@/server/auth/session';
import { ReauthPrompt } from '@/features/admin/shared/session-expired';

export default async function Layout({ children }: { children: ReactNode }) {
  await requireRole(['reviewer', 'admin']);
  // Admins use admin endpoints here too: a refused sensitive action asks for the password in place (D-1837).
  return (
    <>
      <main className="mx-auto max-w-3xl p-6">{children}</main>
      <ReauthPrompt />
    </>
  );
}
