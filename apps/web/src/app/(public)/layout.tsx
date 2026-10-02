// F17 T7 (D-321): minimal layout for public pages — no auth requirement, no app navigation.
// The root layout already provides fonts, providers (ToastProvider, PaywallProvider) and the theme script.
import type { ReactNode } from 'react';

export default function PublicLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
