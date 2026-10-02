import { describe, expect, it } from 'vitest';
import type { MapOp } from '@remoa/contracts';
import { retrievabilityFixture, sepseBoardId, sepseCardIds, sepseCards, sepseEdges } from '@remoa/contracts/mocks';
import { applyOps, freshen, heatOf, invertAll, patchCard, snap, toEdge, toNode, type CardCache, type Graph } from './graph';
import { emptyHistory, push, redo, undo } from './history';

let n = 0;
const id = () => `00000000-0000-4000-8000-${(50_000 + ++n).toString().padStart(12, '0')}`;
const boardId = sepseBoardId;
const sepse = (): Graph => ({
  nodes: sepseCards.map((c) => toNode(c, c.position ?? { x: 0, y: 0 })),
  edges: sepseEdges.map(toEdge),
});

describe('heat', () => {
  it('colours the 6 Sepse cards like the mockup', () => {
    const c = sepseCardIds;
    expect(Object.fromEntries(Object.entries(c).map(([k, v]) => [k, heatOf(v, retrievabilityFixture)]))).toEqual({
      sepse: 'review',
      qsofa: 'watch',
      lactato: 'unknown',
      pacote: 'watch',
      choque: 'review',
      caso: 'steady',
    });
  });
  it('missing retrievability = unknown', () => expect(heatOf(id(), {})).toBe('unknown'));
});

describe('snap', () => {
  it('rounds to the 8px grid', () => expect([snap(3), snap(4), snap(13), snap(-5)]).toEqual([0, 8, 16, -8]));
});

/** Applies `ops`, records them in a history, undoes and redoes, checking the graph each time. */
function roundTrip(g: Graph, ops: MapOp[], cache: CardCache = new Map()) {
  const undoOps = invertAll(g, ops, cache, id);
  const after = applyOps(g, ops, cache);
  const h = push(emptyHistory, { redo: ops, undo: undoOps });
  const u = undo(h, id)!;
  const back = applyOps(after, u.ops, cache);
  const r = redo(u.history, id)!;
  const again = applyOps(back, r.ops, cache);
  return { after, back, again, undoOps, redoOps: r.ops };
}
const shape = (g: Graph) => ({
  nodes: g.nodes.map((x) => [x.id, x.position, x.data.card.title]).sort(),
  edges: g.edges.map((e) => [e.id, e.source, e.target, e.data?.label]).sort(),
});

describe('applyOps + undo/redo of every action', () => {
  it('move → previous positions', () => {
    const g = sepse();
    const ops: MapOp[] = [{ op: 'moveCards', opId: id(), boardId, moves: [{ cardId: sepseCardIds.sepse, position: { x: 999, y: 8 } }] }];
    const { after, back, again } = roundTrip(g, ops);
    expect(after.nodes.find((x) => x.id === sepseCardIds.sepse)?.position).toEqual({ x: 999, y: 8 });
    expect(shape(back)).toEqual(shape(g));
    expect(shape(again)).toEqual(shape(after));
  });

  it('D-202 resize → previous size (null = default); the cache keeps it for a later restore', () => {
    const g = sepse();
    const cache: CardCache = new Map();
    const cardId = sepseCardIds.sepse;
    const ops: MapOp[] = [{ op: 'resizeCards', opId: id(), boardId, sizes: [{ cardId, size: { w: 320, h: 240 } }] }];
    const { after, back, again } = roundTrip(g, ops, cache);
    const size = (x: Graph) => x.nodes.find((n) => n.id === cardId)?.data.card.size;
    expect(size(after)).toEqual({ w: 320, h: 240 });
    expect(size(back)).toBeNull();
    expect(size(again)).toEqual({ w: 320, h: 240 });
    expect(cache.get(cardId)?.size).toEqual({ w: 320, h: 240 });
    expect(invertAll(g, [{ ...ops[0]!, sizes: [{ cardId: id(), size: null }] } as MapOp], cache, id)).toEqual([]); // unknown card: nothing to undo
  });

  it('create card → delete', () => {
    const g = sepse();
    const cid = id();
    const ops: MapOp[] = [{ op: 'createCard', opId: id(), boardId, card: { id: cid, type: 'flow', title: 'Novo fluxograma', position: { x: 8, y: 16 } } }];
    const { after, back, again } = roundTrip(g, ops);
    expect(after.nodes).toHaveLength(7);
    expect(after.nodes.at(-1)?.data.card).toMatchObject({ id: cid, type: 'flow', status: 'draft', front: null });
    expect(shape(back)).toEqual(shape(g));
    expect(shape(again)).toEqual(shape(after));
  });

  it('create edge → delete; edges need both ends; duplicates ignored', () => {
    const g = sepse();
    const eid = id();
    const ops: MapOp[] = [{ op: 'createEdge', opId: id(), boardId, edge: { id: eid, fromCardId: sepseCardIds.caso, toCardId: sepseCardIds.choque, label: null } }];
    const { after, back } = roundTrip(g, ops);
    expect(after.edges).toHaveLength(7);
    expect(applyOps(after, ops, new Map()).edges).toHaveLength(7);
    expect(shape(back)).toEqual(shape(g));
    const dangling: MapOp = { op: 'createEdge', opId: id(), boardId, edge: { id: id(), fromCardId: id(), toCardId: sepseCardIds.caso, label: null } };
    expect(applyOps(g, [dangling], new Map()).edges).toHaveLength(6);
  });

  it('label edit → previous label', () => {
    const g = sepse();
    const ops: MapOp[] = [{ op: 'updateEdgeLabel', opId: id(), boardId, edgeId: sepseEdges[0]!.id, label: null }];
    const { after, back, again } = roundTrip(g, ops);
    expect(after.edges.find((e) => e.id === sepseEdges[0]!.id)?.data?.label).toBeNull();
    expect(shape(back)).toEqual(shape(g));
    expect(shape(again)).toEqual(shape(after));
  });

  it('delete card + edge → undo restores the card (with its content) and every connection', () => {
    const g = sepse();
    const cache: CardCache = new Map();
    const ops: MapOp[] = [
      { op: 'deleteEdges', opId: id(), boardId, edgeIds: [sepseEdges[4]!.id] }, // pacote → lactato
      { op: 'deleteCards', opId: id(), boardId, cardIds: [sepseCardIds.sepse] },
    ];
    const { after, back, again, undoOps } = roundTrip(g, ops, cache);
    expect(after.nodes).toHaveLength(5);
    expect(after.edges).toHaveLength(0); // all other edges touch "Sepse"
    expect(undoOps.map((o) => o.op)).toEqual(['createCard', 'createEdge', 'createEdge', 'createEdge', 'createEdge', 'createEdge', 'createEdge']);
    expect(shape(back)).toEqual(shape(g));
    expect(back.nodes.find((x) => x.id === sepseCardIds.sepse)?.data.card.back).toBe(sepseCards[0]!.back);
    expect(shape(again)).toEqual(shape(after));
  });

  it('inverse ops get fresh opIds on every undo/redo', () => {
    const g = sepse();
    const ops: MapOp[] = [{ op: 'deleteEdges', opId: id(), boardId, edgeIds: [sepseEdges[0]!.id] }];
    const h = push(emptyHistory, { redo: ops, undo: invertAll(g, ops, new Map(), id) });
    const a = undo(h, id)!;
    const b = undo(redo(a.history, id)!.history, id)!;
    expect(a.ops[0]!.opId).not.toBe(b.ops[0]!.opId);
  });

  it('ops on missing things invert to nothing', () => {
    const g = sepse();
    const ghost = id();
    const ops: MapOp[] = [
      { op: 'moveCards', opId: id(), boardId, moves: [{ cardId: ghost, position: { x: 1, y: 1 } }] },
      { op: 'updateEdgeLabel', opId: id(), boardId, edgeId: ghost, label: 'x' },
    ];
    expect(invertAll(g, ops, new Map(), id)).toEqual([]);
    expect(shape(applyOps(g, ops, new Map()))).toEqual(shape(g));
  });
});

describe('history', () => {
  const entry = (): { redo: MapOp[]; undo: MapOp[] } => ({
    redo: [{ op: 'deleteCards', opId: id(), boardId, cardIds: [id()] }],
    undo: [{ op: 'deleteCards', opId: id(), boardId, cardIds: [id()] }],
  });
  it('caps at 50 and new actions clear redo', () => {
    let h = emptyHistory;
    for (let i = 0; i < 60; i++) h = push(h, entry());
    expect(h.past).toHaveLength(50);
    h = undo(h, id)!.history;
    expect(h.future).toHaveLength(1);
    h = push(h, entry());
    expect(h.future).toHaveLength(0);
  });
  it('empty entries and empty stacks are no-ops', () => {
    expect(push(emptyHistory, { redo: [], undo: [] })).toBe(emptyHistory);
    expect(undo(emptyHistory, id)).toBeNull();
    expect(redo(emptyHistory, id)).toBeNull();
  });
});

describe('F02: card saved in the editor', () => {
  it('patchCard updates the node and the cache without ops; redo of an old createCard keeps the new title', () => {
    const cache: CardCache = new Map();
    let h = emptyHistory;
    const cardId = id();
    const create: MapOp = { op: 'createCard', opId: id(), boardId, card: { id: cardId, type: 'flow', title: 'Novo fluxograma', position: { x: 0, y: 0 } } };
    let g = applyOps({ nodes: [], edges: [] }, [create], cache);
    h = push(h, { redo: [create], undo: invertAll({ nodes: [], edges: [] }, [create], cache, id) });

    g = patchCard(g, cache, cardId, { title: 'Pacote', preview: { steps: 3 } });
    expect(g.nodes[0]!.data.card).toMatchObject({ title: 'Pacote', preview: { steps: 3 } });
    expect(cache.get(cardId)?.title).toBe('Pacote');

    const u = undo(h, id)!; // deletes the card
    g = applyOps(g, freshen(u.ops, cache, g), cache);
    expect(g.nodes).toHaveLength(0);
    const r = redo(u.history, id)!; // re-creates it: must not bring back "Novo fluxograma"
    const ops = freshen(r.ops, cache, g);
    expect(ops[0]).toMatchObject({ op: 'createCard', card: { title: 'Pacote' } });
    g = applyOps(g, ops, cache);
    expect(g.nodes[0]!.data.card).toMatchObject({ title: 'Pacote', preview: { steps: 3 } });
    expect(freshen([u.ops[0]!], new Map(), { nodes: [], edges: [] })).toEqual([u.ops[0]]);
  });
});
