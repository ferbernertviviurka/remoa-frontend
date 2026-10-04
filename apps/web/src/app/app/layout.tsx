import type { ReactNode } from 'react';
import { Pwa } from '@/features/shell/pwa';

// F09: service worker + install prompt only under `/app/*`, so public pages (landing) don't ship the dictionary and the offline client (P-174, D-357).
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <Pwa />
    </>
  );
}
