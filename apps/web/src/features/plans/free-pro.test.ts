import { describe, expect, it } from 'vitest';
import { freeProOf } from './free-pro';

const now = new Date('2026-10-06T12:00:00Z');
const at = (h: number) => new Date(now.getTime() + h * 3_600_000);

describe('freeProOf (D-1213)', () => {
  it('null without a grant: Free, paid Pro or Founder', () => {
    expect(freeProOf(null, now)).toBeNull();
    expect(freeProOf({ grantUntil: null, trialUntil: null }, now)).toBeNull();
    expect(freeProOf({ grantUntil: undefined }, now)).toBeNull();
  });
  it('trial while the trial ends the Pro, with days rounded up', () => {
    const end = at(14 * 24 + 3);
    expect(freeProOf({ grantUntil: end, trialUntil: end }, now)).toEqual({ kind: 'trial', until: end, days: 15 });
    expect(freeProOf({ grantUntil: at(2), trialUntil: at(2) }, now)?.days).toBe(1);
  });
  it('gift when a referral month runs or is queued after the trial', () => {
    expect(freeProOf({ grantUntil: at(40 * 24), trialUntil: at(10 * 24) }, now)?.kind).toBe('gift');
    expect(freeProOf({ grantUntil: at(30 * 24), trialUntil: null }, now)).toMatchObject({ kind: 'gift', days: 30 });
  });
  it('accepts the ISO strings the API sends', () => {
    const end = at(72).toISOString() as unknown as Date;
    expect(freeProOf({ grantUntil: end, trialUntil: end }, now)).toMatchObject({ kind: 'trial', days: 3 });
  });
});
