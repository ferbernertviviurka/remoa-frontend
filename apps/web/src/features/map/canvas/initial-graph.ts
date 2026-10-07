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

/**
 * `content:build` places a ready map one module per column (packages/content) and D-1562 kept those columns: few distinct
 * x for many cards. Any other layout (this file's blocks, or the student's own) has about one x per card.
 */
const columnar = (cards: Card[]) => cards.length >= 8 && new Set(cards.map((c) => c.position!.x)).size * 4 <= cards.length;

const GAP = { x: 64, y: 72, block: 240 };

/**
 * A ready map (or a copy) still in module columns: each column (a module, top to bottom = trail order) becomes a block of
 * rows of ~√n cards, centred on each row's middle so the content-sized cards do not line up as a grid; blocks go in
 * rows of ⌈√modules⌉, 240 px apart for the connection labels. Once laid out it is no longer columnar and never touched again.
 */
function trailBlocks(cards: Card[]): Map<string, XYPosition> {
  const size = (c: Card) => sizeOf(c, true);
  const cols = new Map<number, Card[]>();
  for (const c of cards) cols.set(c.position!.x, [...(cols.get(c.position!.x) ?? []), c]);
  const blocks = [...cols].sort(([a], [b]) => a - b).map(([, col]) => {
    col.sort((a, b) => a.position!.y - b.position!.y);
    const per = Math.max(2, Math.ceil(Math.sqrt(col.length)));
    const cells: { id: string; x: number; y: number }[] = [];
    let w = 0;
    let y = 0;
    for (let i = 0; i < col.length; i += per) {
      const row = col.slice(i, i + per);
      const h = Math.max(...row.map((c) => size(c).h));
      let x = 0;
      for (const c of row) {
        const s = size(c);
        cells.push({ id: c.id, x, y: y + (h - s.h) / 2 });
        x += s.w + GAP.x;
      }
      w = Math.max(w, x - GAP.x);
      y += h + GAP.y;
    }
    return { cells, w, h: y - GAP.y };
  });
  const perRow = Math.ceil(Math.sqrt(blocks.length));
  const out = new Map<string, XYPosition>();
  let top = 80;
  for (let i = 0; i < blocks.length; i += perRow) {
    const row = blocks.slice(i, i + perRow);
    let left = 80;
    for (const b of row) {
      for (const c of b.cells) out.set(c.id, snapPos({ x: left + c.x, y: top + c.y }));
      left += b.w + GAP.block;
    }
    top += Math.max(...row.map((b) => b.h)) + GAP.block;
  }
  return out;
}

/** Server graph → local graph: lays out cards without position (imports) and ready maps still in module columns, then replays ops left offline. */
export function initialGraph(data: BoardGraph, cache: CardCache, newId: () => string = () => crypto.randomUUID()): { graph: Graph; layout: MapOp[] } {
  const trail = !!data.board.path;
  const placed = data.cards.filter((c) => c.position);
  const loose = data.cards.filter((c) => !c.position);
  const right = placed.reduce((m, c) => Math.max(m, c.position!.x + sizeOf(c, trail).w + 96), 0);
  const pos = loose.length
    ? autoLayout(loose.map((c) => ({ id: c.id, width: sizeOf(c, trail).w, height: sizeOf(c, trail).h })), data.edges.map((e) => ({ source: e.fromCardId, target: e.toCardId })), { x: right, y: 0 })
    : trail && columnar(placed)
      ? trailBlocks(placed)
      : new Map<string, XYPosition>();
  const nodes = data.cards.map((c) => toNode(c, pos.get(c.id) ?? c.position!));
  const layout: MapOp[] = pos.size
    ? [{ op: 'moveCards', opId: newId(), boardId: data.board.id, moves: [...pos].map(([cardId, position]) => ({ cardId, position })) }]
    : [];
  const graph = applyOps({ nodes, edges: data.edges.map(toEdge) }, loadPending(data.board.id, storage()), cache);
  return { graph, layout };
}
