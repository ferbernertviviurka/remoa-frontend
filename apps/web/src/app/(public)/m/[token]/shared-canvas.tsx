'use client';

// F17 T7 (FR-13): read-only React Flow canvas for shared boards.
// D-320: simple viewer — nodesDraggable/connectable/elementsSelectable false.
// Reuses @xyflow/react and the same css, but no CanvasContext.
// SharedCard.position can be null (not laid out yet) — those cards grid at (0,0) base.
import '@xyflow/react/dist/style.css';
import '@/features/map/canvas/editor.css';
import { useMemo } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  type Node,
  type Edge,
} from '@xyflow/react';
import type { SharedBoard, SharedCard } from '@remoa/contracts';
import { CARD_W, CARD_H } from '@/features/map/canvas/layout';
import { SharedCardNode } from './shared-card-node';

const nodeTypes = { sharedCard: SharedCardNode };

function cardLabel(card: SharedCard): string {
  return card.title;
}

function toNode(card: SharedCard, index: number): Node {
  // Grid fallback for cards without a position
  const position = card.position ?? { x: (index % 5) * (CARD_W + 32), y: Math.floor(index / 5) * (CARD_H + 32) };
  return {
    id: card.id,
    type: 'sharedCard',
    position,
    data: { card },
    // read-only nodes don't need handles
    selectable: false,
    draggable: false,
    connectable: false,
    width: CARD_W,
    height: CARD_H,
  };
}

function toEdge(e: { id: string; fromCardId: string; toCardId: string; label: string | null }): Edge {
  return {
    id: e.id,
    source: e.fromCardId,
    target: e.toCardId,
    label: e.label ?? undefined,
    type: 'default',
    style: { stroke: 'var(--color-muted)', strokeWidth: 1.7 },
  };
}

type Props = { board: SharedBoard };

function SharedCanvasInner({ board }: Props) {
  const nodes = useMemo(() => board.cards.map(toNode), [board.cards]);
  const edges = useMemo(() => board.edges.map(toEdge), [board.edges]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable={false}
      panOnDrag
      zoomOnScroll
      fitView
      fitViewOptions={{ padding: 0.2 }}
      proOptions={{ hideAttribution: true }}
      aria-label={cardLabel(board.cards[0] ?? { id: '', title: board.title, type: 'concept' } as SharedCard)}
    >
      <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="var(--color-border)" />
    </ReactFlow>
  );
}

export function SharedCanvas({ board }: Props) {
  return (
    <ReactFlowProvider>
      <SharedCanvasInner board={board} />
    </ReactFlowProvider>
  );
}
