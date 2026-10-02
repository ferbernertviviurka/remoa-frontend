// Auto-layout (FR-10): dagre left-to-right. Pure; returns top-left positions snapped to the 8px grid.
import dagre from '@dagrejs/dagre';
import type { Card, Position } from '@remoa/contracts';
import { nodeSize } from '@remoa/ui';
import { snapPos } from './graph';

/** Defaults for a node of unknown size (the widest/tallest of the compact cards). */
export const CARD_W = 248;
export const CARD_H = 176;

/** D-095/D-096: fixed size per type + shape (+ question image), the same the NodeCard draws. */
export const sizeOf = (c: Pick<Card, 'type' | 'shape' | 'frontAssetId'>) => nodeSize(c.type, c.shape, { frontImage: !!c.frontAssetId });

export function autoLayout(
  nodes: { id: string; width?: number; height?: number }[],
  edges: { source: string; target: string }[],
  origin: Position = { x: 0, y: 0 },
): Map<string, Position> {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: 'LR', nodesep: 40, ranksep: 96, marginx: 0, marginy: 0 });
  g.setDefaultEdgeLabel(() => ({}));
  const ids = new Set(nodes.map((n) => n.id));
  for (const n of nodes) g.setNode(n.id, { width: n.width ?? CARD_W, height: n.height ?? CARD_H });
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
