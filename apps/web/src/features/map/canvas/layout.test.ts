import { describe, expect, it } from 'vitest';
import type { Board, BoardGraph } from '@remoa/contracts';
import { sepseBoard, sepseCards } from '@remoa/contracts/mocks';
import { initialGraph } from './initial-graph';
import { autoLayout, CARD_H, CARD_W, sizeOf } from './layout';

describe('ready map on the build grid (F31)', () => {
  const cards = sepseCards.map((c, i) => ({ ...c, size: null, frontAssetId: null, front: 'texto longo '.repeat(10 + i * 5), position: { x: 80 + (i % 2) * 340, y: 80 + Math.floor(i / 2) * 160 } }));
  const graph = (path: Board['path']): BoardGraph => ({ board: { ...sepseBoard, path }, cards, edges: [] });
  const path = { slug: 'sepse', modulos: ['fisiopatologia'] } as unknown as Board['path'];

  it('stacks each column by content size without overlap, once', () => {
    const { graph: g, layout } = initialGraph(graph(path), new Map(), () => '00000000-0000-4000-8000-000000000001');
    const boxes = g.nodes.map((n) => ({ ...n.position, ...sizeOf(n.data.card, true)! }));
    expect(boxes.some((b) => b.h > CARD_H)).toBe(true);
    for (let i = 0; i < boxes.length; i++)
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i]!;
        const b = boxes[j]!;
        expect(a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h, `${i} × ${j}`).toBe(false);
      }
    expect(layout).toHaveLength(1);
    const moved = { ...graph(path), cards: cards.map((c) => ({ ...c, position: g.nodes.find((n) => n.id === c.id)!.position })) };
    expect(initialGraph(moved, new Map()).layout).toEqual([]);
  });

  it("leaves a student's own map alone", () => {
    expect(initialGraph(graph(null), new Map()).layout).toEqual([]);
  });
});

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
