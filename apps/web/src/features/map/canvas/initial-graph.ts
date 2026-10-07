// Shared by the desktop editor and the phone map (F23): server graph → local graph, plus the localStorage accessor.
import type { XYPosition } from '@xyflow/react';
import type { BoardGraph, Card, MapOp } from '@remoa/contracts';
import { applyOps, toEdge, toNode, type CardCache, type Graph } from './graph';
import { autoLayout, sizeOf } from './layout';
import { loadPending } from './op-queue';

/** localStorage, or null when it throws (private mode, blocked site data). */
export function storage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/**
 * Server graph → local graph, then replays ops left offline. Lays out cards without position (imports), and once a ready
 * map (F31 `board.path`, or its copy) whose cards were never sized: the module columns of `content:build` (and the earlier
 * columns/blocks of D-1562) ignore the connections, so lines ran under cards and crossed by the hundreds. Dagre by the
 * connections cuts that ~10× (D-1565); the content sizes are saved with it, which marks the map as laid out.
 */
export function initialGraph(data: BoardGraph, cache: CardCache, newId: () => string = () => crypto.randomUUID()): { graph: Graph; layout: MapOp[] } {
  const trail = !!data.board.path;
  const placed = data.cards.filter((c) => c.position);
  const loose = data.cards.filter((c) => !c.position);
  const links = data.edges.map((e) => ({ source: e.fromCardId, target: e.toCardId }));
  const box = (c: Card) => ({ id: c.id, width: sizeOf(c, trail).w, height: sizeOf(c, trail).h });
  const relayout = !loose.length && trail && placed.length > 1 && data.cards.every((c) => !c.size);
  const right = placed.reduce((m, c) => Math.max(m, c.position!.x + sizeOf(c, trail).w + 96), 0);
  const pos = loose.length
    ? autoLayout(loose.map(box), links, { x: right, y: 0 })
    : relayout
      ? autoLayout(placed.map(box), links, { x: 80, y: 80 }, { node: 48, rank: 144 })
      : new Map<string, XYPosition>();
  const sized = (c: Card): Card => {
    if (!relayout) return c;
    const card = { ...c, size: sizeOf(c, true) };
    cache.set(c.id, card);
    return card;
  };
  const nodes = data.cards.map((c) => toNode(sized(c), pos.get(c.id) ?? c.position!));
  const layout: MapOp[] = pos.size
    ? [{ op: 'moveCards', opId: newId(), boardId: data.board.id, moves: [...pos].map(([cardId, position]) => ({ cardId, position })) }]
    : [];
  if (relayout) layout.push({ op: 'resizeCards', opId: newId(), boardId: data.board.id, sizes: placed.map((c) => ({ cardId: c.id, size: sizeOf(c, true) })) });
  const graph = applyOps({ nodes, edges: data.edges.map(toEdge) }, loadPending(data.board.id, storage()), cache);
  return { graph, layout };
}
