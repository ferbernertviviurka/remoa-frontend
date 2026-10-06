'use client';

import { memo, useContext } from 'react';
import { BaseEdge, EdgeLabelRenderer, Position, useInternalNode, useStore, type EdgeProps, type ReactFlowState } from '@xyflow/react';
import { withStrings } from '@remoa/strings';
import * as more from '@remoa/strings/ns';
import { EdgeLabel, routePoints, type Side } from '@remoa/ui';
import { CanvasContext } from './canvas-context';
import { EDGE_COLOR, type LinkEdge } from './graph';

const t = withStrings({ map: more.map });

/** FR-6: labels hide below 70% zoom. Boolean selector = re-render only when crossing the threshold. */
export const labelsVisible = (s: Pick<ReactFlowState, 'transform'>) => s.transform[2] >= 0.7;

type Box = { x: number; y: number; w: number; h: number };

/** G01: the edge leaves/enters by the facing sides (mostly side by side → left/right, mostly stacked → top/bottom). */
export function floatingEnds(a: Box, b: Box) {
  const dx = b.x + b.w / 2 - (a.x + a.w / 2);
  const dy = b.y + b.h / 2 - (a.y + a.h / 2);
  if (Math.abs(dx) * a.h >= Math.abs(dy) * a.w) {
    const right = dx >= 0;
    return {
      sourceX: right ? a.x + a.w : a.x, sourceY: a.y + a.h / 2, sourcePosition: right ? Position.Right : Position.Left,
      targetX: right ? b.x : b.x + b.w, targetY: b.y + b.h / 2, targetPosition: right ? Position.Left : Position.Right,
    };
  }
  const down = dy >= 0;
  return {
    sourceX: a.x + a.w / 2, sourceY: down ? a.y + a.h : a.y, sourcePosition: down ? Position.Bottom : Position.Top,
    targetX: b.x + b.w / 2, targetY: down ? b.y : b.y + b.h, targetPosition: down ? Position.Top : Position.Bottom,
  };
}

const side: Record<Position, Side> = { [Position.Left]: 'l', [Position.Right]: 'r', [Position.Top]: 't', [Position.Bottom]: 'b' };

/**
 * HANDOFF rule 3: orthogonal `route()` (radius ≤ 14) between the facing sides, label pill at the midpoint.
 * Label edit (D-0xx T5): the pill is a button that opens the label dialog; an edge without label shows "+ rótulo" only while selected.
 */
export const LinkEdgeView = memo(function LinkEdgeView(p: EdgeProps<LinkEdge>) {
  const { editLabel, quiz } = useContext(CanvasContext);
  const showLabel = useStore(labelsVisible);
  const src = useInternalNode(p.source);
  const dst = useInternalNode(p.target);
  const box = (n: typeof src): Box | null =>
    n?.measured.width && n.measured.height ? { ...n.internals.positionAbsolute, w: n.measured.width, h: n.measured.height } : null;
  const a = box(src);
  const b = box(dst);
  const e = a && b ? floatingEnds(a, b) : p; // not measured yet: handle positions
  const { d, lx, ly } = routePoints([e.sourceX, e.sourceY], side[e.sourcePosition], [e.targetX, e.targetY]);
  const label = p.data?.label ?? null;
  return (
    <>
      <BaseEdge id={p.id} path={d} markerEnd={p.markerEnd} style={{ stroke: p.selected ? 'var(--primary)' : EDGE_COLOR, strokeWidth: 1.7, strokeLinecap: 'round' }} />
      {showLabel && quiz?.hiddenEdges.has(p.id) ? (
        // the label of the connection being asked is the answer: never in the DOM before /answer
        <EdgeLabelRenderer>
          <div className="nodrag nopan absolute" style={{ transform: `translate(-50%, -50%) translate(${lx}px, ${ly}px)` }}>
            <EdgeLabel label={t('quiz.hiddenEdge')} />
          </div>
        </EdgeLabelRenderer>
      ) : showLabel && label && quiz ? (
        <EdgeLabelRenderer>
          <div className="nodrag nopan absolute" style={{ transform: `translate(-50%, -50%) translate(${lx}px, ${ly}px)` }}>
            <EdgeLabel label={label} dimmed />
          </div>
        </EdgeLabelRenderer>
      ) : showLabel && (label || p.selected) ? (
        <EdgeLabelRenderer>
          <div className="nodrag nopan absolute" style={{ transform: `translate(-50%, -50%) translate(${lx}px, ${ly}px)`, pointerEvents: 'all' }}>
            <EdgeLabel
              label={label ?? t('map.edge.empty')}
              buttonLabel={label ? t('map.edge.editLabel', { label }) : t('map.edge.addLabel')}
              onClick={() => editLabel(p.id)}
            />
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
});
