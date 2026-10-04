'use client';

import type { ReactNode } from 'react';
import { ToastProvider } from '@remoa/ui';
import { PaywallProvider } from '@/features/billing/paywall';

/** Labels come from the server layout so this client module does not pull the whole dictionary into every page (P-174). */
export function Providers({ children, closeLabel, viewportLabel }: { children: ReactNode; closeLabel: string; viewportLabel: string }) {
  return (
    <ToastProvider closeLabel={closeLabel} viewportLabel={viewportLabel}>
      <PaywallProvider>{children}</PaywallProvider>
    </ToastProvider>
  );
}
