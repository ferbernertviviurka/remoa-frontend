import { describe, expect, it } from 'vitest';
import { clampZoom, fromViewport, stepZoom, toViewport, urgentCenter } from './view';

describe('phone zoom steps (FR-4)', () => {
  it('steps 25% on the grid and snaps to it from a pinch value', () => {
    expect(stepZoom(1, 1)).toBe(1.25);
    expect(stepZoom(1, -1)).toBe(0.75);
    expect(stepZoom(0.6, 1)).toBe(0.75);
    expect(stepZoom(0.6, -1)).toBe(0.5);
  });
  it('stays within 40–180%', () => {
    expect(stepZoom(0.5, -1)).toBe(0.4);
    expect(stepZoom(1.75, 1)).toBe(1.8);
    expect(clampZoom(3)).toBe(1.8);
  });
});

describe('initial view (Q-083)', () => {
  const box = { w: 152, h: 124 };
  const cards = [
    { id: 'a', position: { x: 0, y: 0 }, updatedAt: '2026-10-01T00:00:00Z', ...box },
    { id: 'b', position: { x: 400, y: 0 }, updatedAt: '2026-10-03T00:00:00Z', ...box },
    { id: 'c', position: { x: 0, y: 400 }, updatedAt: '2026-09-01T00:00:00Z', ...box },
  ];
  const now = Date.parse('2026-10-05T12:00:00Z');
  it('centres the most overdue card', () => {
    const heat = {
      a: { r: 0.5, state: 'review' as const, due: new Date('2026-10-04T00:00:00Z') },
      c: { r: 0.4, state: 'review' as const, due: new Date('2026-10-02T00:00:00Z') },
      b: { r: 0.9, state: 'steady' as const, due: new Date('2026-10-09T00:00:00Z') },
    };
    expect(urgentCenter(cards, heat, now)).toEqual({ x: 76, y: 462 });
  });
  it('without due cards, the most recently edited; empty map = null', () => {
    expect(urgentCenter(cards, {}, now)).toEqual({ x: 476, y: 62 });
    expect(urgentCenter([], {}, now)).toBeNull();
  });
  it('saved view ↔ viewport round-trip', () => {
    const vp = toViewport({ x: 100, y: 50, zoom: 0.6 }, 390, 844);
    expect(vp).toEqual({ x: 135, y: 392, zoom: 0.6 });
    expect(fromViewport(vp, 390, 844)).toEqual({ x: 100, y: 50, zoom: 0.6 });
  });
});
