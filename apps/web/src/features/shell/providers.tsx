'use client';

import type { ReactNode } from 'react';
import { ToastProvider } from '@remoa/ui';
import { PaywallProvider } from '@/features/billing/paywall';
import { DevApiToasts } from './dev-api-toasts';

/** Labels come from the server layout so this client module does not pull the whole dictionary into every page (P-174). */
export function Providers({ children, closeLabel, viewportLabel }: { children: ReactNode; closeLabel: string; viewportLabel: string }) {
  return (
    <ToastProvider closeLabel={closeLabel} viewportLabel={viewportLabel}>
      <PaywallProvider>{children}</PaywallProvider>
      {process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_API_DEBUG === '1' ? <DevApiToasts /> : null}
    </ToastProvider>
  );
}
