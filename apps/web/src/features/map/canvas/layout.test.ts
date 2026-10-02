import { describe, expect, it } from 'vitest';
import { autoLayout, CARD_H, CARD_W } from './layout';

describe('autoLayout', () => {
  it('60 cards: no overlap, integer positions on the 8px grid', () => {
    const nodes = Array.from({ length: 60 }, (_, i) => ({ id: `c${i}` }));
    // a tree plus some cross links and a few isolated cards
    const edges = nodes.slice(1, 50).map((n, i) => ({ source: `c${Math.floor(i / 3)}`, target: n.id }));
    edges.push({ source: 'c10', target: 'c40' }, { source: 'c5', target: 'c5' }, { source: 'c1', target: 'ghost' });
    const pos = autoLayout(nodes, edges, { x: 100, y: 100 });
    expect(pos.size).toBe(60);
    const boxes = [...pos.values()];
    for (const p of boxes) {
      expect(p.x % 8).toBe(0);
      expect(p.y % 8).toBe(0);
    }
    for (let i = 0; i < boxes.length; i++)
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i]!;
        const b = boxes[j]!;
        const overlap = a.x < b.x + CARD_W && b.x < a.x + CARD_W && a.y < b.y + CARD_H && b.y < a.y + CARD_H;
        expect(overlap, `c${i} × c${j}`).toBe(false);
      }
  });
  it('left to right: a source sits left of its target', () => {
    const pos = autoLayout([{ id: 'a' }, { id: 'b' }], [{ source: 'a', target: 'b' }]);
    expect(pos.get('a')!.x).toBeLessThan(pos.get('b')!.x);
  });
});

describe('autoLayout with shapes (D-095)', () => {
  it('uses each node size: a tall diamond and a wide rect do not overlap', () => {
    const nodes = [
      { id: 'a', width: 224, height: 224 },
      { id: 'b', width: 232, height: 240 },
      { id: 'c', width: 180, height: 180 },
    ];
    const pos = autoLayout(nodes, [{ source: 'a', target: 'b' }, { source: 'a', target: 'c' }]);
    const box = (id: string) => ({ ...pos.get(id)!, ...nodes.find((n) => n.id === id)! });
    const [b, c] = [box('b'), box('c')];
    expect(b.y + b.height <= c.y || c.y + c.height <= b.y).toBe(true);
  });
});
