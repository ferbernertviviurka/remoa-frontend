'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PLAN_LIMITS, type CheckoutSessionStatus } from '@remoa/contracts';
import { t } from '@remoa/strings';
import { Alert, Button, Dialog, SuccessPanel } from '@remoa/ui';
import { track } from '@/lib/analytics';
import { api } from '@/lib/api';
import { useEntitlements } from '@/features/shell/entitlements';

export const POLL_MS = 3000;
export const POLL_MAX_MS = 120_000;

/** F15 FR-8. `initial` was verified on the server; Pro is only shown once the server says `paid` (the webhook, D-181). */
export function SuccessView({ sessionId, initial, plan: initialPlan = 'pro' }: { sessionId: string; initial: CheckoutSessionStatus['status']; plan?: CheckoutSessionStatus['plan'] }) {
  const router = useRouter();
  const { refresh } = useEntitlements();
  const [status, setStatus] = useState(initial);
  const [plan, setPlan] = useState(initialPlan);
  const [timedOut, setTimedOut] = useState(false);
  const refreshed = useRef(false);

  useEffect(() => {
    if (status !== 'pending_pix') return;
    track('checkout_pending_pix', {});
    const started = Date.now();
    const id = setInterval(async () => {
      if (Date.now() - started >= POLL_MAX_MS) { clearInterval(id); return setTimedOut(true); }
      const r = await api<CheckoutSessionStatus>(`/v1/billing/checkout/${sessionId}`).catch(() => null);
      if (r?.ok && r.data.status !== 'pending_pix') { clearInterval(id); setPlan(r.data.plan ?? initialPlan); setStatus(r.data.status); }
    }, POLL_MS);
    return () => clearInterval(id);
  }, [status, sessionId, initialPlan]);

  useEffect(() => {
    if (status === 'canceled' || status === 'expired') router.replace('/app/planos?cancelado=1');
    if (status !== 'paid' || refreshed.current) return;
    refreshed.current = true;
    void refresh(); // navbar chip reads the entitlements provider
    router.refresh(); // server-rendered entitlements
  }, [status, refresh, router]);

  if (status === 'paid') {
    const pro = PLAN_LIMITS.pro;
    const founder = plan === 'founder';
    const title = t(founder ? 'plans.success.founder.title' : 'plans.success.title');
    const subtitle = t(founder ? 'plans.success.founder.subtitle' : 'plans.success.subtitle');
    const benefits = founder
      ? [t('plans.success.founder.benefits.pro'), t('plans.success.founder.benefits.aiGrades'), t('plans.success.founder.benefits.pdfMaps'), t('plans.success.founder.benefits.early')]
      : [
          t('plans.success.benefits.unlimited'),
          t('plans.success.benefits.aiGrades'),
          t('plans.success.benefits.pdfMaps', { n: pro.limits.ai_generations }),
          t('plans.success.benefits.anki', { n: new Intl.NumberFormat('pt-BR').format(pro.ankiImportMaxCards) }),
        ];
    return (
      <Dialog open size="bare" srOnlyHeader title={title} description={subtitle} closeLabel={t('common.close')} onOpenChange={(o) => o || router.push('/app/planos')}>
        <SuccessPanel
          inDialog
          title={title}
          description={subtitle}
          benefits={benefits}
          actions={
            <>
              <Button onClick={() => router.push('/app/hoje')}>{t('plans.success.goToday')}</Button>
              <Button variant="secondary" onClick={() => router.push('/app/mapas/novo')}>{t('plans.success.createMap')}</Button>
            </>
          }
        />
      </Dialog>
    );
  }
  return (
    <main className="mx-auto flex max-w-[540px] flex-col items-center gap-4 px-4 py-20 text-center">
      <h1 className="m-0 font-display text-[30px] font-extrabold">{t('plans.pixPending.title')}</h1>
      <p className="m-0 text-muted">{t('plans.pixPending.body')}</p>
      {timedOut ? (
        <>
          <Alert tone="watch" title={t('plans.pixPending.timeout')} />
          <Button onClick={() => router.push('/app/planos')}>{t('plans.success.seePlans')}</Button>
        </>
      ) : (
        <p role="status" className="m-0 text-sm text-muted">{t('plans.pixPending.checking')}</p>
      )}
    </main>
  );
}
