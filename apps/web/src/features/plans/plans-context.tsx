'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';
import type { BillingPeriod, CouponValidation, Entitlements, PriceBook, SubscriptionSummary } from '@remoa/contracts';

type PlansCtx = {
  priceBook: PriceBook;
  /** null = failed to load (FR-12: matrix without the usage line). */
  entitlements: Entitlements | null;
  /** null = not a subscriber (or Free). */
  subscription: SubscriptionSummary | null;
  period: BillingPeriod;
  setPeriod: (p: BillingPeriod) => void;
  /** Valid founder code applied (validated on the server); null = none. */
  coupon: { code: string; prices: Extract<CouponValidation, { valid: true }> } | null;
  setCoupon: (c: PlansCtx['coupon']) => void;
};

const Ctx = createContext<PlansCtx | null>(null);

/** Shared by header (period toggle), matrix (Pro price), order summary and subscriber card (F15). */
export function PlansProvider({
  initial,
  children,
}: {
  initial: Pick<PlansCtx, 'priceBook' | 'entitlements' | 'subscription' | 'period'>;
  children: ReactNode;
}) {
  const [period, setPeriod] = useState(initial.period);
  const [coupon, setCoupon] = useState<PlansCtx['coupon']>(null);
  return <Ctx.Provider value={{ ...initial, period, setPeriod, coupon, setCoupon }}>{children}</Ctx.Provider>;
}

export function usePlans(): PlansCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error('usePlans outside PlansProvider');
  return v;
}
