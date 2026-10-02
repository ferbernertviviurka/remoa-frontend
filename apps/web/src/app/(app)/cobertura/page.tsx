import type { Metadata } from 'next';
import { matrixAreas, type BoardSummary, type CoverageRow, type HomeSummary, type MatrixItem } from '@remoa/contracts';
import { t } from '@remoa/strings';
import { CoverageView } from '@/features/coverage/coverage-view';
import { EmptyState } from '@/features/shell/empty-state';
import { serverApi } from '@/lib/api/server';

export const metadata: Metadata = { title: t('pages.coverage') };

export default async function Page() {
  const [coverage, home, boards, ...items] = await Promise.all([
    serverApi<CoverageRow[]>('/v1/coverage'),
    serverApi<HomeSummary>('/v1/home'),
    serverApi<BoardSummary[]>('/v1/boards'),
    ...matrixAreas.map((a) => serverApi<MatrixItem[]>(`/v1/matrix/items?area=${a}`)),
  ]);
  if (!coverage.ok) return <EmptyState title={t('empty.coverage.title')} body={t('coverage.loadError')} />;
  return (
    <CoverageView
      rows={coverage.data}
      items={items.flatMap((r) => (r.ok ? r.data : []))}
      summary={{ dueToday: home.ok ? home.data.dueToday : 0 }}
      boards={boards.ok ? boards.data : []}
    />
  );
}
