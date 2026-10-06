'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { PaywallReason } from '@remoa/contracts';
import { PLAN_LIMITS } from '@remoa/contracts/constants';
import { t } from '@remoa/strings';
import { Button, Dialog } from '@remoa/ui';
import { track } from '@/lib/analytics';

// Split from paywall.tsx and lazy-loaded there: keeps contracts (zod) + the full dictionary out of every page's first load (P-174/P-175, D-372).
const freeLimits = PLAN_LIMITS.free.limits;
const messageVars: Record<PaywallReason, Record<string, number>> = {
  ai_quota: { n: freeLimits.ai_grades, pro: PLAN_LIMITS.pro.limits.ai_grades ?? 0 },
  boards: { n: freeLimits.boards },
  cards: { n: freeLimits.cards },
  pdf: { n: PLAN_LIMITS.pro.limits.ai_generations ?? 0 },
  anki: { n: PLAN_LIMITS.free.ankiImports },
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
      description={reason ? t(`billing.paywall.${reason}`, messageVars[reason]) : undefined}
      closeLabel={t('common.close')}
    >
      <div className="flex flex-col gap-2 sm:flex-row-reverse">
        <Button
          onClick={() => {
            onClose();
            router.push(`/app/planos?de=${reason}`);
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
