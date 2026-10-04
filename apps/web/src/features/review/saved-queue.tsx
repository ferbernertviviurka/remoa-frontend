'use client';

import { useEffect, useState } from 'react';
import { t } from '@remoa/strings';
import { Alert } from '@remoa/ui';
import { EmptyState } from '@/features/shell/empty-state';
import { recallQueue, type SavedQueue } from './queue-cache';
import { QueueView } from './queue-view';

/** Shown when the API cannot load today's queue: the last one stored on the device. */
export function SavedQueueView({ message }: { message: string }) {
  const [saved, setSaved] = useState<SavedQueue | null | undefined>(undefined);

  useEffect(() => {
    void recallQueue().then(setSaved);
  }, []);

  if (saved === undefined) return null;
  if (!saved) return <EmptyState title={t('revisar.hoje')} body={message} />;
  return (
    <div className="flex flex-col gap-4">
      {saved.items.length > 0 ? <Alert tone="watch" title={t('review.savedOffline')} /> : null}
      <QueueView items={saved.items} boardTitles={saved.boardTitles} />
    </div>
  );
}
