import { PlansSectionView, type PlansSectionProps } from './plans-section';
import { planFacts } from './plan-facts';

/** Server wrapper (D-535): the client view gets plain numbers from `planFacts`. */
export function PlansSection({ priceBook, flags }: PlansSectionProps) {
  return <PlansSectionView priceBook={priceBook} flags={flags} facts={planFacts(priceBook)} />;
}
