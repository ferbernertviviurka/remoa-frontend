import { strings } from '@remoa/strings/landing';
import type { IaFeature, IaFeatureState } from '../flags';

const ia = strings.landing.ia;
const keys = ['pdf', 'gerar', 'corrigir', 'resumo'] as const satisfies readonly IaFeature[];

/** D-1551: the lead only affirms features that are `live`. */
export function iaLead(features: Record<IaFeature, IaFeatureState>) {
  if (keys.every((k) => features[k] === 'live')) return ia.lead;
  if (features.pdf === 'live' && features.corrigir === 'live' && features.gerar !== 'live' && features.resumo !== 'live') return ia.leadPartial;
  return ia.leadSafe;
}

export function iaCardBody(key: IaFeature, state: IaFeatureState) {
  const card = ia.cards[key];
  return state === 'soon' ? card.soonBody : card.body;
}
