'use client';

import { useEffect, useState } from 'react';
import { REVIEW_SESSION_MAX } from '@/lib/contracts-lite';
import { t } from '@remoa/strings';
import { Alert, Button, Icon } from '@remoa/ui';
import { useChallenge } from '@/features/challenge/provider';
import { useNavigate } from '@/features/shell/use-navigate';
import { ReviewError } from './error-panel';
import { recallQueue, type SavedQueue } from './queue-cache';

/** Shown when the API cannot load the hub: the last queue stored on the device (offline), or the error with "Tentar de novo". */
export function SavedQueueView({ message }: { message: string }) {
  const [saved, setSaved] = useState<SavedQueue | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [navigating, router] = useNavigate();
  const { begin } = useChallenge();

  useEffect(() => {
    void recallQueue().then(setSaved);
  }, []);

  if (saved === undefined) return null;
  if (!saved || saved.items.length === 0) return <ReviewError message={message} />;
  return (
    <div className="flex flex-col gap-4">
      <Alert tone="watch" title={t('review.savedOffline')} />
      <h1 className="m-0 font-display text-[32px] font-extrabold tracking-[-.04em]">{t('review.hub.saved.title', { n: saved.items.length })}</h1>
      {failed ? <Alert tone="review" role="alert" title={t('review.hub.panel.startError')} /> : null}
      <div>
        <Button
          size="cta"
          loading={busy || navigating}
          icon={<Icon name="bolt" size={24} />}
          onClick={async () => {
            setBusy(true);
            const first = await begin({ kind: 'daily' }, Math.min(saved.items.length, REVIEW_SESSION_MAX));
            if (first) router.push(`/app/mapas/${first.boardId}?modo=desafio&sessao=diaria`);
            else {
              setBusy(false);
              setFailed(true);
            }
          }}
        >
          {t('review.hub.panel.start', { n: saved.items.length })}
        </Button>
      </div>
    </div>
  );
}
