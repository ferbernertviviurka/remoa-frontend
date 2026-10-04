import type { Metadata } from 'next';
import type { ProgressSummary } from '@remoa/contracts';
import { t } from '@remoa/strings';
import { EmptyState } from '@/features/shell/empty-state';
import { serverApi } from '@/lib/api/server';
import { ProgressView } from '@/features/reports/progress-view';

export const metadata: Metadata = { title: t('pages.progress') };

export default async function Page() {
  const r = await serverApi<ProgressSummary>('/v1/reports/progress');
  if (!r.ok) return <EmptyState title={t('progress.title')} body={t('progress.loadError')} />;
  return <ProgressView summary={r.data} />;
}
