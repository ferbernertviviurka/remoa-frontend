'use client';

import type { ReactNode } from 'react';
import { t } from '@remoa/strings';
import { ToastProvider } from '@remoa/ui';
import { PaywallProvider } from '@/features/billing/paywall';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ToastProvider closeLabel={t('common.close')} viewportLabel={t('common.notifications')}>
      <PaywallProvider>{children}</PaywallProvider>
    </ToastProvider>
  );
}
