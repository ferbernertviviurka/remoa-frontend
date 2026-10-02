'use client';

import { useLandingAnalytics } from '../analytics';
import type { H1Variant } from './variants';

/** Renders nothing; fires `landing_viewed` + `scroll_depth` (FR-19). */
export function LandingAnalytics({ variant, h1 }: { variant: '29' | '49' | null; h1: H1Variant }) {
  useLandingAnalytics(variant, h1);
  return null;
}
