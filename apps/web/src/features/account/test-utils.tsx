import type { ReactNode } from 'react';
import type { AccountSnapshot } from '@remoa/contracts';
import { ToastProvider } from '@remoa/ui';
import { AccountProvider } from './shell/account-context';
import { PhotoDialogProvider } from './profile/photo-dialog';

/** Providers the account sections expect; `initial` comes from `@remoa/contracts/mocks` fixtures. */
export const Wrap = ({ initial, children }: { initial: AccountSnapshot; children: ReactNode }) => (
  <ToastProvider closeLabel="Fechar" viewportLabel="Avisos">
    <AccountProvider initial={initial}>
      <PhotoDialogProvider>{children}</PhotoDialogProvider>
    </AccountProvider>
  </ToastProvider>
);
