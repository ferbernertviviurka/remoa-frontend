// Shared by the desktop editor and the phone map (F23): server graph → local graph, plus the localStorage accessor.
import type { XYPosition } from '@xyflow/react';
import type { BoardGraph, MapOp } from '@remoa/contracts';
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

/** Server graph → local graph: lays out cards without position (imports), then replays ops left offline. */
export function initialGraph(data: BoardGraph, cache: CardCache, newId: () => string = () => crypto.randomUUID()): { graph: Graph; layout: MapOp[] } {
  const placed = data.cards.filter((c) => c.position);
  const loose = data.cards.filter((c) => !c.position);
  const right = placed.reduce((m, c) => Math.max(m, c.position!.x + sizeOf(c).w + 96), 0);
  const pos = loose.length
    ? autoLayout(loose.map((c) => ({ id: c.id, width: sizeOf(c).w, height: sizeOf(c).h })), data.edges.map((e) => ({ source: e.fromCardId, target: e.toCardId })), { x: right, y: 0 })
    : new Map<string, XYPosition>();
  const nodes = data.cards.map((c) => toNode(c, c.position ?? pos.get(c.id)!));
  const layout: MapOp[] = loose.length
    ? [{ op: 'moveCards', opId: newId(), boardId: data.board.id, moves: [...pos].map(([cardId, position]) => ({ cardId, position })) }]
    : [];
  const graph = applyOps({ nodes, edges: data.edges.map(toEdge) }, loadPending(data.board.id, storage()), cache);
  return { graph, layout };
}
