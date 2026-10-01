import { describe, expect, it } from 'vitest';
import { bbox, clamp01, isRect, isTiny, moveVertex, nearestVertex, normalize, pointInPolygon, rectToPolygon, toPoints, translate } from './polygon';

const sq = rectToPolygon({ x: 0.2, y: 0.2 }, { x: 0.6, y: 0.5 });
const tri = [{ x: 0.1, y: 0.1 }, { x: 0.5, y: 0.1 }, { x: 0.3, y: 0.4 }];

describe('polygon utils', () => {
  it('clamps and normalizes client points to 0..1 of the image box', () => {
    expect(clamp01(-1)).toBe(0);
    expect(clamp01(2)).toBe(1);
    const rect = { left: 100, top: 50, width: 400, height: 200 };
    expect(normalize({ x: 300, y: 150 }, rect)).toEqual({ x: 0.5, y: 0.5 });
    expect(normalize({ x: 0, y: 999 }, rect)).toEqual({ x: 0, y: 1 });
    expect(normalize({ x: 10, y: 10 }, { left: 0, top: 0, width: 0, height: 0 })).toEqual({ x: 0, y: 0 });
  });

  it('rectToPolygon gives 4 clockwise points from any two corners, clamped', () => {
    expect(rectToPolygon({ x: 0.6, y: 0.5 }, { x: 0.2, y: 0.2 })).toEqual(sq);
    expect(rectToPolygon({ x: -1, y: 0.5 }, { x: 0.5, y: 2 })).toEqual([
      { x: 0, y: 0.5 }, { x: 0.5, y: 0.5 }, { x: 0.5, y: 1 }, { x: 0, y: 1 },
    ]);
    expect(isRect(sq)).toBe(true);
    expect(isRect(tri)).toBe(false);
    expect(isRect([{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0.8, y: 1 }, { x: 0, y: 1 }])).toBe(false);
  });

  it('bbox and point-in-polygon', () => {
    expect(bbox(tri)).toEqual({ minX: 0.1, minY: 0.1, maxX: 0.5, maxY: 0.4 });
    expect(pointInPolygon({ x: 0.3, y: 0.2 }, tri)).toBe(true);
    expect(pointInPolygon({ x: 0.1, y: 0.39 }, tri)).toBe(false);
    expect(pointInPolygon({ x: 0.4, y: 0.3 }, sq)).toBe(true);
    expect(pointInPolygon({ x: 0.7, y: 0.3 }, sq)).toBe(false);
  });

  it('translate moves without leaving the image or deforming', () => {
    const moved = translate(sq, 0.1, 0.1);
    expect(moved[0]!.x).toBeCloseTo(0.3);
    expect(moved[2]!.y).toBeCloseTo(0.6);
    const pushed = translate(sq, 5, -5);
    expect(bbox(pushed)).toEqual({ minX: expect.closeTo(0.6), minY: 0, maxX: 1, maxY: expect.closeTo(0.3) });
  });

  it('moveVertex resizes rects by the opposite corner and moves free vertices', () => {
    const r = moveVertex(sq, 2, { x: 0.9, y: 0.8 });
    expect(r).toEqual(rectToPolygon({ x: 0.2, y: 0.2 }, { x: 0.9, y: 0.8 }));
    const flipped = moveVertex(sq, 2, { x: 0.1, y: 0.1 }); // dragging past the fixed corner flips, still a rect
    expect(isRect(flipped)).toBe(true);
    expect(moveVertex(tri, 1, { x: 1.5, y: 0.2 })[1]).toEqual({ x: 1, y: 0.2 });
  });

  it('nearestVertex measures in pixels', () => {
    const size = { width: 1000, height: 500 };
    expect(nearestVertex(sq, { x: 0.205, y: 0.205 }, size, 12)).toBe(0);
    expect(nearestVertex(sq, { x: 0.4, y: 0.35 }, size, 12)).toBe(-1);
  });

  it('isTiny and toPoints', () => {
    expect(isTiny(rectToPolygon({ x: 0.5, y: 0.5 }, { x: 0.502, y: 0.7 }))).toBe(true);
    expect(isTiny(sq)).toBe(false);
    expect(toPoints(tri)).toBe('0.1,0.1 0.5,0.1 0.3,0.4');
  });
});
