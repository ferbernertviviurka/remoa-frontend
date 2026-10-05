'use client';

import { Suspense, createContext, lazy, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { PaywallReason, QuotaKey } from '@remoa/contracts';

const Paywall = lazy(() => import('./paywall-dialog').then((m) => ({ default: m.Paywall })));

const reasonOfQuota: Record<QuotaKey, PaywallReason> = { ai_grades: 'ai_quota', ai_generations: 'pdf', boards: 'boards', cards: 'cards' };

/** Maps an API error (HTTP 402 `{code: 'quota_exceeded', message: <QuotaKey>}`) to the paywall reason; null for any other error. */
export function paywallFromError(error: { code: string; message?: string }): PaywallReason | null {
  if (error.code !== 'quota_exceeded') return null;
  if (error.message === 'anki') return 'anki'; // D-648: per-account Anki import cap
  return reasonOfQuota[error.message as QuotaKey] ?? 'ai_quota';
}

type Api = { show: (reason: PaywallReason) => void; /** true when `error` was a quota error and the paywall opened. */ handle: (error: { code: string; message?: string }) => boolean };
const noop: Api = { show: () => undefined, handle: () => false }; // outside a provider (unit tests of other features) the paywall is inert
const Ctx = createContext<Api>(noop);

export function PaywallProvider({ children }: { children: ReactNode }) {
  const [reason, setReason] = useState<PaywallReason | null>(null);
  const [seen, setSeen] = useState(false); // mount the lazy dialog on first use and keep it, so closing still animates
  const show = useCallback((r: PaywallReason) => { setSeen(true); setReason(r); }, []);
  const handle = useCallback((e: { code: string; message?: string }) => {
    const r = paywallFromError(e);
    if (r) show(r);
    return r !== null;
  }, [show]);
  const api = useMemo(() => ({ show, handle }), [show, handle]);
  return (
    <Ctx.Provider value={api}>
      {children}
      {seen ? <Suspense fallback={null}><Paywall reason={reason} onClose={() => setReason(null)} /></Suspense> : null}
    </Ctx.Provider>
  );
}

export const usePaywall = () => useContext(Ctx);
