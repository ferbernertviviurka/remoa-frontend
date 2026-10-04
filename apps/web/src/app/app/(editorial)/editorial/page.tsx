import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { t } from '@remoa/strings';
import { EditorialView } from '@/features/editorial/editorial-view';
import { serverApi } from '@/lib/api/server';

export const metadata: Metadata = { title: t('pages.editorial') };

export default async function Page() {
  const queue = await serverApi<unknown[]>('/v1/editorial/queue');
  if (!queue.ok && (queue.error.code === 'not_found' || queue.error.code === 'forbidden')) notFound();
  return <EditorialView />;
}
