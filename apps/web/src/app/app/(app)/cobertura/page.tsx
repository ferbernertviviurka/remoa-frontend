import type { Metadata } from 'next';
import { matrixAreas, type BoardSummary, type CoverageRow, type HomeSummary, type MatrixItem } from '@remoa/contracts';
import { withStrings } from '@remoa/strings';
import * as more from '@remoa/strings/ns';
import { CoverageView } from '@/features/coverage/coverage-view';
import { EmptyState } from '@/features/shell/empty-state';
import { CoverageGate } from '@/features/coverage/coverage-gate';
import type { StudyProfileState } from '@/features/study-profile/api';
import { serverApi } from '@/lib/api/server';

const t = withStrings({ coverage: more.coverage });

export const metadata: Metadata = { title: t('pages.coverage') };

export default async function Page() {
  // F35 FR-27: decided on the server, so protected content never flashes. API failure keeps the legacy behavior (Enamed visible, D-1853).
  const study = await serverApi<StudyProfileState>('/v1/account/study-profile');
  if (study.ok && !study.data.capabilities.showEnamed) return <CoverageGate />;
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
