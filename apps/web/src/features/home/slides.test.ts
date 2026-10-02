import { describe, expect, it } from 'vitest';
import type { BoardSummary, Entitlements } from '@remoa/contracts';
import { atBoardLimit, buildMapSlides } from './slides';

const ent = (boards: number | null) => ({ limits: { boards } }) as unknown as Entitlements;
const board = (id: string, dueCount = 0, day = 1) => ({ id, dueCount, updatedAt: new Date(`2026-09-0${day}T10:00:00Z`) }) as unknown as BoardSummary;
const maps = (n: number) => Array.from({ length: n }, (_, i) => board(`m${i}`, 0, i + 1));
const kinds = (n: number, limit: number | null) => buildMapSlides({ maps: maps(n), entitlements: ent(limit) }).map((s) => s.kind).join(',');

describe('buildMapSlides', () => {
  it.each([
    ['Free 0', 0, 2, 'new,locked'],
    ['Free 1', 1, 2, 'map,new,locked'],
    ['Free 2', 2, 2, 'map,map,locked'],
    ['Free 3 (legacy)', 3, 2, 'map,map,map,locked'],
    ['Pro 0', 0, null, 'new'],
    ['Pro 1', 1, null, 'map,new'],
    ['Pro 2', 2, null, 'map,map,new'],
    ['Pro 3', 3, null, 'map,map,map'],
    ['Pro 6', 6, null, 'map,map,map,map,map,map'],
  ])('%s', (_n, n, limit, expected) => expect(kinds(n, limit)).toBe(expected));

  it('Free new card carries the remaining count; locked carries the limit', () => {
    const s = buildMapSlides({ maps: maps(1), entitlements: ent(2) });
    expect(s[1]).toEqual({ kind: 'new', remaining: 1 });
    expect(s[2]).toEqual({ kind: 'locked', max: 2 });
    expect(buildMapSlides({ maps: [], entitlements: ent(null) })[0]).toEqual({ kind: 'new', remaining: null });
  });

  it('orders: due first (more due first), then last access', () => {
    const order = buildMapSlides({ maps: [board('old', 0, 1), board('few', 2, 2), board('new', 0, 9), board('many', 7, 3)], entitlements: ent(null) })
      .flatMap((s) => (s.kind === 'map' ? [s.board.id] : []));
    expect(order).toEqual(['many', 'few', 'new', 'old']);
  });

  it('atBoardLimit only for a finite limit reached', () => {
    expect(atBoardLimit(2, ent(2))).toBe(true);
    expect(atBoardLimit(1, ent(2))).toBe(false);
    expect(atBoardLimit(9, ent(null))).toBe(false);
    expect(atBoardLimit(9, null)).toBe(false);
  });
});
