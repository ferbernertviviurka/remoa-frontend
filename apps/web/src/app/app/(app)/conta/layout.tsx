import type { ReactNode } from 'react';
import type { AccountSnapshot } from '@remoa/contracts';
import { AccountProvider } from '@/features/account/shell/account-context';
import { AccountError } from '@/features/account/shell/account-error';
import { AccountShell } from '@/features/account/shell/account-shell';
import { serverApi } from '@/lib/api/server';

// One layout for every section: GET /v1/account/me runs once and hero + subnav stay mounted while the section changes.
// G14 (D-584): no requireUser() here. It was a Supabase Auth round trip (getUser) in series before /me; the middleware already
// requires a session and the API checks it on /me (serverApi sends a revoked session to /entrar, D-565).
export default async function Layout({ children }: { children: ReactNode }) {
  const r = await serverApi<AccountSnapshot>('/v1/account/me');
  if (!r.ok) return <AccountError />;
  return (
    <AccountProvider initial={r.data}>
      <AccountShell>{children}</AccountShell>
    </AccountProvider>
  );
}
