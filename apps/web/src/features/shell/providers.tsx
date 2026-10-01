'use client';

import type { ReactNode } from 'react';
import { t } from '@remoa/strings';
import { ToastProvider } from '@remoa/ui';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ToastProvider closeLabel={t('common.close')} viewportLabel={t('common.notifications')}>
      {children}
    </ToastProvider>
  );
}
