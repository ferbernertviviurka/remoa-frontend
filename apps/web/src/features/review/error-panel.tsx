'use client';

import { withStrings } from '@remoa/strings';
import * as more from '@remoa/strings/ns';
import { Button, Empty } from '@remoa/ui';
import { useNavigate } from '@/features/shell/use-navigate';

const t = withStrings({ review: more.review }); // P-512: namespace fora do núcleo

/** FR-16: the hub could not load. */
export function ReviewError({ message }: { message: string }) {
  const [pending, nav] = useNavigate();
  return (
    <Empty
      heading
      title={t('review.hub.error.title')}
      description={message}
      action={
        <Button variant="primary" loading={pending} onClick={() => nav.refresh()}>
          {t('review.hub.error.retry')}
        </Button>
      }
    />
  );
}
