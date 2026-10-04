import type { OverviewPeriod } from '@remoa/contracts';

/** `?period=` → 7 | 30 | 90 (default 30, FR-13). */
export const parsePeriod = (v: string | undefined): OverviewPeriod => (v === '7' ? 7 : v === '90' ? 90 : 30);
