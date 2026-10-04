import { t, type StringKey } from '@remoa/strings';
import type { BoardSummary, QueueItem } from '@remoa/contracts';
import { QueueView } from '@/features/review/queue-view';
import { SavedQueueView } from '@/features/review/saved-queue';
import { serverApi } from '@/lib/api/server';

export default async function Page() {
  const [q, b] = await Promise.all([serverApi<QueueItem[]>('/v1/review/queue?limit=500'), serverApi<BoardSummary[]>('/v1/boards')]);
  if (!q.ok) return <SavedQueueView message={t(`errors.${q.error.code}` as StringKey)} />;
  const titles = Object.fromEntries((b.ok ? b.data : []).map((x) => [x.id, x.title]));
  return <QueueView items={q.data} boardTitles={titles} />;
}
