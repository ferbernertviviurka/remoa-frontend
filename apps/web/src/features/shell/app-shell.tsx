import type { ReactNode } from 'react';
import type { BoardSummary } from '@remoa/contracts';
import { serverApi } from '@/lib/api/server';
import { BottomNav } from './bottom-nav';
import { Rail } from './rail';

export async function AppShell({ children }: { children: ReactNode }) {
  // A failing API must never break the shell: no badge instead.
  const boards = await serverApi<BoardSummary[]>('/v1/boards').then((r) => (r.ok ? r.data : [])).catch(() => []);
  const dueTotal = boards.reduce((a, b) => a + b.dueCount, 0);
  return (
    <div className="flex min-h-dvh bg-canvas text-text">
      <div className="sticky top-0 hidden h-dvh md:flex">
        <Rail dueTotal={dueTotal} />
      </div>
      <main className="min-w-0 flex-1 p-4 pb-24 md:p-6 md:pb-6">{children}</main>
      <BottomNav />
    </div>
  );
}
