'use client';

import { useRouter } from 'next/navigation';
import { t } from '@remoa/strings';
import { Alert, Button } from '@remoa/ui';

/** F15 FR-12: the price book failed to load, so there is nothing honest to show. */
export function PlansError() {
  const router = useRouter();
  return (
    <div className="mx-auto w-full max-w-[640px] py-10">
      <Alert tone="review" title={t('plans.states.pageError')} role="alert">
        <Button variant="secondary" size="sm" onClick={() => router.refresh()}>{t('plans.states.retry')}</Button>
      </Alert>
    </div>
  );
}
