'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { PLAN_LIMITS, type PaywallReason, type QuotaKey } from '@remoa/contracts';
import { t } from '@remoa/strings';
import { Button, Dialog } from '@remoa/ui';
import { track } from '@/lib/analytics';

const reasonOfQuota: Record<QuotaKey, PaywallReason> = { ai_grades: 'ai_quota', ai_generations: 'pdf', boards: 'boards', cards: 'cards' };

/** Maps an API error (HTTP 402 `{code: 'quota_exceeded', message: <QuotaKey>}`) to the paywall reason; null for any other error. */
export function paywallFromError(error: { code: string; message?: string }): PaywallReason | null {
  if (error.code !== 'quota_exceeded') return null;
  return reasonOfQuota[error.message as QuotaKey] ?? 'ai_quota';
}

const freeLimits = PLAN_LIMITS.free.limits;
const messageVars: Record<PaywallReason, number> = {
  ai_quota: freeLimits.ai_grades,
  boards: freeLimits.boards,
  cards: freeLimits.cards,
  pdf: PLAN_LIMITS.pro.limits.ai_generations,
};

export function Paywall({ reason, onClose }: { reason: PaywallReason | null; onClose: () => void }) {
  const router = useRouter();
  useEffect(() => {
    if (reason) track('paywall_viewed', { reason });
  }, [reason]);
  return (
    <Dialog
      open={reason !== null}
      onOpenChange={(o) => !o && onClose()}
      title={t('billing.paywall.title')}
      description={reason ? t(`billing.paywall.${reason}`, { n: messageVars[reason] }) : undefined}
      closeLabel={t('common.close')}
    >
      <div className="flex flex-col gap-2 sm:flex-row-reverse">
        <Button
          onClick={() => {
            onClose();
            router.push(`/planos?de=${reason}`);
          }}
        >
          {t('billing.paywall.cta')}
        </Button>
        <Button variant="quiet" onClick={onClose}>
          {t('billing.paywall.dismiss')}
        </Button>
      </div>
    </Dialog>
  );
}

type Api = { show: (reason: PaywallReason) => void; /** true when `error` was a quota error and the paywall opened. */ handle: (error: { code: string; message?: string }) => boolean };
const noop: Api = { show: () => undefined, handle: () => false }; // outside a provider (unit tests of other features) the paywall is inert
const Ctx = createContext<Api>(noop);

export function PaywallProvider({ children }: { children: ReactNode }) {
  const [reason, setReason] = useState<PaywallReason | null>(null);
  const handle = useCallback((e: { code: string; message?: string }) => {
    const r = paywallFromError(e);
    if (r) setReason(r);
    return r !== null;
  }, []);
  const api = useMemo(() => ({ show: setReason, handle }), [handle]);
  return (
    <Ctx.Provider value={api}>
      {children}
      <Paywall reason={reason} onClose={() => setReason(null)} />
    </Ctx.Provider>
  );
}

export const usePaywall = () => useContext(Ctx);
