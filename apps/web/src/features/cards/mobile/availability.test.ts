import { describe, expect, it } from 'vitest';
import { PLAN_LIMITS, type Entitlements } from '@remoa/contracts';
import { createAvailability } from './availability';

const ent = (plan: 'free' | 'pro', usage: Partial<Entitlements['usage']> = {}): Entitlements => ({
  plan, status: null, ...PLAN_LIMITS[plan], usage: { ai_grades: 0, ai_generations: 0, boards: 0, cards: 0, ...usage },
  ankiImportsUsed: 0, renewsAt: null, cancelAtPeriodEnd: false, graceUntil: null,
});

describe('createAvailability (D-668)', () => {
  it('no entitlements (request failed): nothing blocked, no counts', () => {
    expect(createAvailability(null)).toEqual({});
  });
  it('Free at the card limit blocks the card options, not Anki', () => {
    const a = createAvailability(ent('free', { cards: PLAN_LIMITS.free.limits.cards }));
    for (const k of ['concept', 'flowchart', 'case', 'image', 'photo'] as const) expect(a[k]?.status).toBe('limit');
    expect(a.anki?.status).toBeUndefined();
  });
  it('Anki import cap used up blocks Anki', () => {
    expect(createAvailability({ ...ent('free'), ankiImportsUsed: 1 }).anki?.status).toBe('limit');
  });
  it('Free has no AI generations: AI and PDF are Pro-only', () => {
    const a = createAvailability(ent('free'));
    expect(a.ai?.status).toBe('pro');
    expect(a.pdf?.status).toBe('pro');
  });
  it('under the limit nothing is blocked; AI shows what is left', () => {
    const a = createAvailability(ent('pro', { cards: 3, ai_generations: 2 }));
    expect(a.concept?.status).toBeUndefined();
    expect(a.ai?.hint).toContain(String(PLAN_LIMITS.pro.limits.ai_generations - 2));
  });
  it('AI quota used up blocks AI and PDF', () => {
    const a = createAvailability(ent('pro', { ai_generations: PLAN_LIMITS.pro.limits.ai_generations }));
    expect(a.ai?.status).toBe('limit');
    expect(a.pdf?.status).toBe('limit');
  });
  it('null = unlimited: cards never block', () => {
    const e = ent('pro', { cards: 99999 });
    expect(createAvailability({ ...e, limits: { ...e.limits, cards: null } }).concept?.status).toBeUndefined();
  });
});
