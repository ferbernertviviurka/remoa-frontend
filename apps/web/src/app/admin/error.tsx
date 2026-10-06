'use client';

import { t } from '@remoa/strings/admin';
import { Button, Empty } from '@remoa/ui';

export default function AdminError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div role="alert" className="p-10 max-lg:p-4">
      <Empty heading title={t('admin.error.title')} description={t('admin.error.body')} action={<Button onClick={reset}>{t('admin.error.retry')}</Button>} />
    </div>
  );
}
