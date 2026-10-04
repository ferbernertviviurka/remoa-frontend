import { describe, expect, it } from 'vitest';
import { filterMobileCards } from './mobile-list';

const cards = [
  { id: 'a', title: 'Noradrenalina' },
  { id: 'b', title: 'Lactato' },
];

describe('filterMobileCards', () => {
  it('filters by title and recall state', () => {
    const heat = { a: { r: 0.4, state: 'review' as const, due: null } };
    expect(filterMobileCards(cards, 'nora', 'all', heat).map((c) => c.id)).toEqual(['a']);
    expect(filterMobileCards(cards, '', 'review', heat).map((c) => c.id)).toEqual(['a']);
    expect(filterMobileCards(cards, '', 'unknown', heat).map((c) => c.id)).toEqual(['b']);
  });
});
