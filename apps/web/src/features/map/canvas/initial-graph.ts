// Shared by the desktop editor and the phone map (F23): server graph → local graph, plus the localStorage accessor.
import type { XYPosition } from '@xyflow/react';
import type { BoardGraph, Card, MapOp } from '@remoa/contracts';
import { applyOps, snapPos, toEdge, toNode, type CardCache, type Graph } from './graph';
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

/** `content:build` places a ready map's cards one module per column, 340 px apart, rows every 160 px (packages/content). */
const onBuildGrid = (cards: Card[]) => cards.every((c) => c.position && (c.position.x - 80) % 340 === 0 && (c.position.y - 80) % 160 === 0);

/**
 * A ready map (or a copy) still on the build grid: its content-sized cards overlap there, so each column is stacked by the
 * cards' real heights, 56 px apart, and columns get 160 px for the connection labels. Once moved it is off the grid and
 * the student's layout is never touched again.
 */
function trailColumns(cards: Card[]): Map<string, XYPosition> {
  const size = (c: Card) => sizeOf(c, true);
  const cols = new Map<number, Card[]>();
  for (const c of cards) cols.set(c.position!.x, [...(cols.get(c.position!.x) ?? []), c]);
  const out = new Map<string, XYPosition>();
  let x = 80;
  for (const col of [...cols].sort(([a], [b]) => a - b).map(([, cs]) => cs.sort((a, b) => a.position!.y - b.position!.y))) {
    let y = 80;
    for (const c of col) {
      out.set(c.id, snapPos({ x, y }));
      y += size(c).h + 56;
    }
    x += Math.max(...col.map((c) => size(c).w)) + 160;
  }
  return out;
}

/** Server graph → local graph: lays out cards without position (imports) and ready maps still on the build grid, then replays ops left offline. */
export function initialGraph(data: BoardGraph, cache: CardCache, newId: () => string = () => crypto.randomUUID()): { graph: Graph; layout: MapOp[] } {
  const trail = !!data.board.path;
  const placed = data.cards.filter((c) => c.position);
  const loose = data.cards.filter((c) => !c.position);
  const right = placed.reduce((m, c) => Math.max(m, c.position!.x + sizeOf(c, trail).w + 96), 0);
  const pos = loose.length
    ? autoLayout(loose.map((c) => ({ id: c.id, width: sizeOf(c, trail).w, height: sizeOf(c, trail).h })), data.edges.map((e) => ({ source: e.fromCardId, target: e.toCardId })), { x: right, y: 0 })
    : trail && placed.length > 1 && onBuildGrid(placed)
      ? trailColumns(placed)
      : new Map<string, XYPosition>();
  const nodes = data.cards.map((c) => toNode(c, pos.get(c.id) ?? c.position!));
  const layout: MapOp[] = pos.size
    ? [{ op: 'moveCards', opId: newId(), boardId: data.board.id, moves: [...pos].map(([cardId, position]) => ({ cardId, position })) }]
    : [];
  const graph = applyOps({ nodes, edges: data.edges.map(toEdge) }, loadPending(data.board.id, storage()), cache);
  return { graph, layout };
}
