import type { ReactNode } from 'react';
import type { AccountSnapshot } from '@remoa/contracts';
import { AccountProvider } from '@/features/account/shell/account-context';
import { AccountError } from '@/features/account/shell/account-error';
import { AccountShell } from '@/features/account/shell/account-shell';
import { serverApi } from '@/lib/api/server';
import { requireUser } from '@/server/auth/session';

// One layout for every section: GET /v1/account/me runs once and hero + subnav stay mounted while the section changes.
export default async function Layout({ children }: { children: ReactNode }) {
  await requireUser();
  const r = await serverApi<AccountSnapshot>('/v1/account/me');
  if (!r.ok) return <AccountError />;
  return (
    <AccountProvider initial={r.data}>
      <AccountShell>{children}</AccountShell>
    </AccountProvider>
  );
}
