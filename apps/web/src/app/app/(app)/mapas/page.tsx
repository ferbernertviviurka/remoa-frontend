import type { Metadata } from 'next';
import { t, type StringKey } from '@remoa/strings';
import type { BoardSummary } from '@remoa/contracts';
import { BoardsView } from '@/features/map/boards/boards-view';
import { EmptyState } from '@/features/shell/empty-state';
import { serverApi } from '@/lib/api/server';

export const metadata: Metadata = { title: t('pages.library') };

export default async function Page() {
  const r = await serverApi<BoardSummary[]>('/v1/boards?include=preview');
  if (!r.ok) return <EmptyState title={t('boards.title')} body={t(`errors.${r.error.code}` as StringKey)} />;
  return <BoardsView boards={r.data} />;
}
