import { redirect } from 'next/navigation';
import { checkoutSessionIdSchema, type CheckoutSessionStatus } from '@remoa/contracts';
import { serverApi } from '@/lib/api/server';
import { SuccessView } from '@/features/plans/success/success-view';
import { loadPlans } from '@/features/plans/load-plans';
import { PlansProvider } from '@/features/plans/plans-context';
import { PlansView } from '@/features/plans/plans-view';

/** F15 FR-8: the server verifies the session; the query is never trusted. canceled/expired/invalid go back to /planos?cancelado=1. */
export default async function Page({ searchParams }: { searchParams: Promise<{ session_id?: string }> }) {
  const id = checkoutSessionIdSchema.safeParse((await searchParams).session_id);
  if (!id.success) redirect('/app/planos');
  const r = await serverApi<CheckoutSessionStatus>(`/v1/billing/checkout/${id.data}`);
  if (!r.ok || r.data.status === 'canceled' || r.data.status === 'expired') redirect('/app/planos?cancelado=1');
  // The success panel sits on the plans page (Planos.dc.html); router.refresh() after `paid` re-renders it as Pro.
  const plans = await loadPlans();
  return (
    <>
      {plans ? (
        <PlansProvider initial={plans}>
          <PlansView canceled={false} />
        </PlansProvider>
      ) : null}
      <SuccessView sessionId={id.data} initial={r.data.status} plan={r.data.plan} />
    </>
  );
}
