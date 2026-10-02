'use client';

import { useRouter } from 'next/navigation';
import { t } from '@remoa/strings';
import { Button } from '@remoa/ui';
import { EmptyState } from '@/features/shell/empty-state';

export function AccountError() {
  const router = useRouter();
  return (
    <EmptyState title={t('account.title')} body={t('account.genericError')}>
      <Button onClick={() => router.refresh()}>{t('account.retry')}</Button>
    </EmptyState>
  );
}
