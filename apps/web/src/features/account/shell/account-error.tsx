'use client';

import { useRouter } from 'next/navigation';
import { withStrings } from '@remoa/strings';
import * as more from '@remoa/strings/ns';
import { Button } from '@remoa/ui';
import { EmptyState } from '@/features/shell/empty-state';

const t = withStrings({ account: more.account });

export function AccountError() {
  const router = useRouter();
  return (
    <EmptyState title={t('account.title')} body={t('account.genericError')}>
      <Button onClick={() => router.refresh()}>{t('account.retry')}</Button>
    </EmptyState>
  );
}
