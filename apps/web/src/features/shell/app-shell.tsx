import type { ReactNode } from 'react';
import { BottomNav } from './bottom-nav';
import { Header } from './header';
import type { BoardSummary } from '@remoa/contracts';
import { serverApi } from '@/lib/api/server';
import { Sidebar } from './sidebar';

export async function AppShell({ children }: { children: ReactNode }) {
  // A failing API must never break the shell: no list instead.
  const boards = await serverApi<BoardSummary[]>('/v1/boards').then((r) => (r.ok ? r.data : [])).catch(() => []);
  return (
    <div className="flex min-h-dvh bg-canvas text-text">
      <Sidebar boards={boards} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header />
        <main className="flex-1 p-4 pb-24 md:p-6 md:pb-6">{children}</main>
      </div>
      <BottomNav />
    </div>
  );
}
