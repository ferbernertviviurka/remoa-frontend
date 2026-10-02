// Auto-layout (FR-10): dagre left-to-right. Pure; returns top-left positions snapped to the 8px grid.
import dagre from '@dagrejs/dagre';
import type { CardType, Position } from '@remoa/contracts';
import { snapPos } from './graph';

/** T5: NodeCard sizes (HANDOFF rule 3). Layout uses the widest card so columns line up. */
export const NODE_H: Record<CardType, number> = { concept: 150, case: 176, flow: 282, image: 206 };
export const CARD_W = 248;
export const CARD_H = 176;

export function autoLayout(
  nodes: { id: string; height?: number }[],
  edges: { source: string; target: string }[],
  origin: Position = { x: 0, y: 0 },
): Map<string, Position> {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: 'LR', nodesep: 40, ranksep: 96, marginx: 0, marginy: 0 });
  g.setDefaultEdgeLabel(() => ({}));
  const ids = new Set(nodes.map((n) => n.id));
  for (const n of nodes) g.setNode(n.id, { width: CARD_W, height: n.height ?? CARD_H });
  for (const e of edges) if (ids.has(e.source) && ids.has(e.target) && e.source !== e.target) g.setEdge(e.source, e.target);
  dagre.layout(g);
  const out = new Map<string, Position>();
  for (const n of nodes) {
    const p = g.node(n.id);
    // dagre gives centres; snapping moves each corner ≤ 4px, gaps stay ≥ 32px.
    out.set(n.id, snapPos({ x: origin.x + p.x - p.width / 2, y: origin.y + p.y - p.height / 2 }));
  }
  return out;
}
