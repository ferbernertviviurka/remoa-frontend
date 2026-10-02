import type { Entitlements, PriceBook, SubscriptionSummary } from '@remoa/contracts';
import { serverApi } from '@/lib/api/server';

/** Server data of /planos, shared with /planos/sucesso (the success panel sits on top of the plans page, as in the mock). null = prices failed. */
export async function loadPlans(periodo?: string) {
  const [prices, ent, sub] = await Promise.all([
    serverApi<PriceBook>('/v1/billing/prices'),
    serverApi<Entitlements>('/v1/billing/entitlements'),
    serverApi<SubscriptionSummary | null>('/v1/billing/subscription'),
  ]);
  if (!prices.ok) return null;
  return {
    priceBook: prices.data,
    entitlements: ent.ok ? ent.data : null, // FR-12: matrix without the usage line
    subscription: sub.ok ? sub.data : null,
    period: periodo === 'anual' ? ('annual' as const) : ('monthly' as const),
  };
}
