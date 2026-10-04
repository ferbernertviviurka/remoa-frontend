'use client';

import type { ReactNode } from 'react';
import { t } from '@remoa/strings';
import { ToastProvider } from '@remoa/ui';
import { PaywallProvider } from '@/features/billing/paywall';
import { Pwa } from './pwa';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ToastProvider closeLabel={t('common.close')} viewportLabel={t('common.notifications')}>
      <PaywallProvider>
        {children}
        <Pwa />
      </PaywallProvider>
    </ToastProvider>
  );
}
