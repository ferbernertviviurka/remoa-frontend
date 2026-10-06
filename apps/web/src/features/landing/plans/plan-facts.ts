import { annualDiscountPercent, monthlyEquivalent, planDefinition } from '@remoa/contracts/constants';
import type { PlanFacts, PlansSectionProps } from './plans-section';

/** Server-side (D-535): plan limits and price math, so the plans island does not ship `@remoa/contracts` + zod. */
export const planFacts = (priceBook: PlansSectionProps['priceBook']): PlanFacts => ({
  free: planDefinition('free'), pro: planDefinition('pro'), discountPercent: annualDiscountPercent(priceBook), monthlyEquivalent: monthlyEquivalent(priceBook),
});
