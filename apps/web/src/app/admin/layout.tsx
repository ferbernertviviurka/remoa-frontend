import type { ReactNode } from 'react';
import { AdminNav } from '@/features/admin/shared/admin-nav';
import { SessionExpired } from '@/features/admin/shared/session-expired';
import { sessionExpired } from '@/features/admin/shared/reauth';
import { requireAdmin } from '@/features/admin/shared/api';

// Non-admin: 404 (CLAUDE.md rule 9). The API re-checks the role on every call.
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const me = await requireAdmin();
  return (
    <div className="flex min-h-dvh bg-canvas text-text">
      <AdminNav openTickets={me.openTickets} name={me.name} email={me.email} />
      <main className="flex min-w-0 flex-1 flex-col">{sessionExpired(me.authenticatedAt) ? <SessionExpired /> : children}</main>
    </div>
  );
}
