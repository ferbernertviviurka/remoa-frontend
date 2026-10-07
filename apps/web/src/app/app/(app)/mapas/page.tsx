import type { Metadata } from 'next';
import { withStrings } from '@remoa/strings';
import * as more from '@remoa/strings/ns';
import type { BoardSummary } from '@remoa/contracts';
import { LibraryView, MapsTabs } from '@/features/library/library-view';
import { BoardsView } from '@/features/map/boards/boards-view';
import { EmptyState } from '@/features/shell/empty-state';
import { serverApi } from '@/lib/api/server';

const t = withStrings({ boards: more.boards });
type StringKey = Parameters<typeof t>[0];

export const metadata: Metadata = { title: t('pages.library') };

export default async function Page({ searchParams }: { searchParams: Promise<{ aba?: string }> }) {
  if ((await searchParams).aba === 'biblioteca') return <div className="mx-auto flex w-full max-w-5xl flex-col gap-4"><MapsTabs active="library" /><LibraryView /></div>;
  const r = await serverApi<BoardSummary[]>('/v1/boards?include=preview');
  if (!r.ok) return <EmptyState title={t('boards.title')} body={t(`errors.${r.error.code}` as StringKey)} />;
  return <><MapsTabs active="mine" /><BoardsView boards={r.data} /></>;
}
