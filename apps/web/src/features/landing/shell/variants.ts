import type { LaunchPhase } from '../flags';

export type H1Variant = 'a' | 'b' | 'c';
type Param = string | string[] | undefined;
const first = (p: Param) => (Array.isArray(p) ? p[0] : p);

/** FR-3: `?h=a|b|c`, anything else is `a`. */
export const parseH = (p: Param): H1Variant => {
  const v = first(p);
  return v === 'b' || v === 'c' ? v : 'a';
};

/** FR-12 / D-233: `?v=29|49` only counts in the `waitlist` phase; in `open` the price is the checkout's. */
export const parseV = (p: Param, phase: LaunchPhase): '29' | '49' | null => {
  const v = first(p);
  return phase === 'waitlist' && (v === '29' || v === '49') ? v : null;
};
