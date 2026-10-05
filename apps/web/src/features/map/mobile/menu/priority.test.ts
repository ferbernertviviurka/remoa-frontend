import { describe, expect, it } from 'vitest';
import type { RetrievabilityMap } from '@remoa/contracts';
import { sortByPriority, summarize } from './priority';

const cards = ['a', 'b', 'c', 'd', 'e'].map((id) => ({ id, title: id }));
const heat = {
  a: { r: 0.9, state: 'steady' },
  b: { r: 0.5, state: 'review', due: new Date('2026-10-04T00:00:00Z') },
  c: { r: 0.4, state: 'review', due: new Date('2026-10-01T00:00:00Z') },
  d: { r: 0.7, state: 'watch', due: new Date('2026-10-06T00:00:00Z') },
} as RetrievabilityMap;

describe('priority', () => {
  it('orders by state, then most overdue; cards without heat go last', () => {
    expect(sortByPriority(cards, heat).map((c) => c.id)).toEqual(['c', 'b', 'd', 'a', 'e']);
  });
  it('summarizes average recall and counts per state', () => {
    const s = summarize(cards, heat);
    expect(Math.round(s.average)).toBe(63);
    expect(s.counts).toEqual({ review: 2, watch: 1, steady: 1, unknown: 1 });
  });
});
