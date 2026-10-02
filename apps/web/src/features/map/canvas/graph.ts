// Pure graph helpers for the canvas: Card/Edge <-> React Flow nodes/edges, local apply of MapOps, inverses for undo.
import type { Edge as RFEdge, Node } from '@xyflow/react';
import type { Card, CardType, Edge, MapOp, MapState, Position, RetrievabilityMap } from '@remoa/contracts';

export type CardNode = Node<{ card: Card }, 'card'>;
export type LinkEdge = RFEdge<{ label: string | null }, 'link'>;
export type Graph = { nodes: CardNode[]; edges: LinkEdge[] };
/** Every card ever seen in this session, so a restore (undo of delete) brings back front/back/source too. */
export type CardCache = Map<string, Card>;

export const GRID = 8;
/** D-084: edges #8E88B5 1.7px with an arrow (Editor.dc.html). */
export const EDGE_COLOR = '#8E88B5';
export const snap = (v: number) => Math.round(v / GRID) * GRID;
export const snapPos = (p: Position): Position => ({ x: snap(p.x), y: snap(p.y) });

export const toNode = (card: Card, position: Position): CardNode => ({
  id: card.id,
  type: 'card',
  position,
  // T5: the NodeCard <button> is the only tab stop; the RF wrapper keeps its keydown (Enter selects, arrows move).
  domAttributes: { tabIndex: -1 },
  data: { card },
});

export const toEdge = (e: Pick<Edge, 'id' | 'fromCardId' | 'toCardId' | 'label'>): LinkEdge => ({
  id: e.id,
  type: 'link',
  source: e.fromCardId,
  target: e.toCardId,
  markerEnd: { type: 'arrowclosed', color: EDGE_COLOR, width: 12, height: 12 },
  data: { label: e.label },
});

export const heatOf = (cardId: string, map: RetrievabilityMap): MapState => map[cardId]?.state ?? 'unknown';

function newCard(boardId: string, c: { id: string; type: CardType; title: string; position: Position }): Card {
  return { ...c, boardId, front: null, back: null, source: null, status: 'draft', order: 0, reviewerId: null, updatedAt: new Date() };
}

/** Applies ops to the local graph (same semantics as the API; idempotent). */
export function applyOps(g: Graph, ops: MapOp[], cache: CardCache): Graph {
  let { nodes, edges } = g;
  for (const o of ops) {
    if (o.op === 'moveCards') {
      const to = new Map(o.moves.map((m) => [m.cardId, m.position]));
      nodes = nodes.map((n) => {
        const p = to.get(n.id);
        return p ? { ...n, position: p } : n;
      });
    } else if (o.op === 'createCard') {
      if (nodes.some((n) => n.id === o.card.id)) continue;
      const known = cache.get(o.card.id);
      const card = known ? { ...known, type: o.card.type, title: o.card.title } : newCard(o.boardId, o.card);
      cache.set(card.id, card);
      nodes = [...nodes, toNode(card, o.card.position)];
    } else if (o.op === 'createEdge') {
      const { id, fromCardId, toCardId } = o.edge;
      const live = new Set(nodes.map((n) => n.id));
      if (edges.some((e) => e.id === id) || !live.has(fromCardId) || !live.has(toCardId)) continue;
      edges = [...edges, toEdge(o.edge)];
    } else if (o.op === 'updateEdgeLabel') {
      edges = edges.map((e) => (e.id === o.edgeId ? { ...e, data: { label: o.label } } : e));
    } else if (o.op === 'deleteCards') {
      const ids = new Set(o.cardIds);
      for (const n of nodes) if (ids.has(n.id)) cache.set(n.id, n.data.card);
      nodes = nodes.filter((n) => !ids.has(n.id));
      edges = edges.filter((e) => !ids.has(e.source) && !ids.has(e.target));
    } else {
      const ids = new Set(o.edgeIds);
      edges = edges.filter((e) => !ids.has(e.id));
    }
  }
  return { nodes, edges };
}

const edgeOp = (base: Pick<MapOp, 'opId' | 'boardId'>, e: LinkEdge): MapOp => ({
  ...base,
  op: 'createEdge',
  edge: { id: e.id, fromCardId: e.source, toCardId: e.target, label: e.data?.label ?? null },
});

/** Ops that undo `o`, given the graph right before `o` was applied. */
export function invert(g: Graph, o: MapOp, newId: () => string): MapOp[] {
  const base = { opId: newId(), boardId: o.boardId };
  switch (o.op) {
    case 'moveCards': {
      const from = new Map(g.nodes.map((n) => [n.id, n.position]));
      const moves = o.moves.flatMap((m) => {
        const p = from.get(m.cardId);
        return p ? [{ cardId: m.cardId, position: p }] : [];
      });
      return moves.length ? [{ ...base, op: 'moveCards', moves }] : [];
    }
    case 'createCard':
      return [{ ...base, op: 'deleteCards', cardIds: [o.card.id] }];
    case 'createEdge':
      return [{ ...base, op: 'deleteEdges', edgeIds: [o.edge.id] }];
    case 'updateEdgeLabel': {
      const prev = g.edges.find((e) => e.id === o.edgeId);
      return prev ? [{ ...base, op: 'updateEdgeLabel', edgeId: o.edgeId, label: prev.data?.label ?? null }] : [];
    }
    case 'deleteCards': {
      const ids = new Set(o.cardIds);
      const cards: MapOp[] = g.nodes
        .filter((n) => ids.has(n.id))
        .map((n) => ({
          opId: newId(),
          boardId: o.boardId,
          op: 'createCard',
          card: { id: n.id, type: n.data.card.type, title: n.data.card.title, position: n.position },
        }));
      const links = g.edges.filter((e) => ids.has(e.source) || ids.has(e.target)).map((e) => edgeOp({ opId: newId(), boardId: o.boardId }, e));
      return [...cards, ...links];
    }
    case 'deleteEdges': {
      const ids = new Set(o.edgeIds);
      return g.edges.filter((e) => ids.has(e.id)).map((e) => edgeOp({ opId: newId(), boardId: o.boardId }, e));
    }
  }
}

/** Inverse of a sequence: invert each op against the graph before it, in reverse order. */
export function invertAll(g: Graph, ops: MapOp[], cache: CardCache, newId: () => string): MapOp[] {
  const out: MapOp[][] = [];
  let cur = g;
  for (const o of ops) {
    out.push(invert(cur, o, newId));
    cur = applyOps(cur, [o], new Map(cache));
  }
  return out.reverse().flat();
}

/**
 * F02: after a card save, the node shows the new fields right away. Not a MapOp: nothing is queued or recorded.
 * The cache is updated too, so a later undo of a delete restores the edited card.
 */
export function patchCard(g: Graph, cache: CardCache, id: string, patch: Partial<Card>): Graph {
  const prev = cache.get(id) ?? g.nodes.find((n) => n.id === id)?.data.card;
  if (prev) cache.set(id, { ...prev, ...patch });
  return { ...g, nodes: g.nodes.map((n) => (n.id === id ? { ...n, data: { card: { ...n.data.card, ...patch } } } : n)) };
}

/**
 * Replayed createCard ops (undo/redo) carry the title from when they were recorded; the API upserts it.
 * Use the latest known title so an edit made in the card editor is not reverted.
 */
export function freshen(ops: MapOp[], cache: CardCache, g: Graph): MapOp[] {
  return ops.map((o) => {
    if (o.op !== 'createCard') return o;
    const title = g.nodes.find((n) => n.id === o.card.id)?.data.card.title ?? cache.get(o.card.id)?.title;
    return title && title !== o.card.title ? { ...o, card: { ...o.card, title } } : o;
  });
}
