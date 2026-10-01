'use client';

import { memo, useContext } from 'react';
import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath, useStore, type EdgeProps, type ReactFlowState } from '@xyflow/react';
import { t } from '@remoa/strings';
import { EdgeLabel } from '@remoa/ui';
import { CanvasContext } from './canvas-context';
import { EDGE_COLOR, type LinkEdge } from './graph';

/** FR-6: labels hide below 70% zoom. Boolean selector = re-render only when crossing the threshold. */
const labelsVisible = (s: ReactFlowState) => s.transform[2] >= 0.7;

/** Orthogonal edge with the Torph label pill (inline edit). */
export const LinkEdgeView = memo(function LinkEdgeView(p: EdgeProps<LinkEdge>) {
  const { saveLabel } = useContext(CanvasContext);
  const showLabel = useStore(labelsVisible);
  const [path, x, y] = getSmoothStepPath({ ...p, borderRadius: 6 });
  const label = p.data?.label ?? null;
  return (
    <>
      <BaseEdge id={p.id} path={path} markerEnd={p.markerEnd} style={{ stroke: p.selected ? 'var(--primary)' : EDGE_COLOR, strokeWidth: 1.5 }} />
      {showLabel ? (
        <EdgeLabelRenderer>
          <div className="nodrag nopan absolute" style={{ transform: `translate(-50%, -50%) translate(${x}px, ${y}px)`, pointerEvents: 'all' }}>
            <EdgeLabel
              label={label}
              emptyText={t('map.edge.noLabel')}
              buttonLabel={label ? t('map.edge.editLabel', { label }) : t('map.edge.addLabel')}
              inputLabel={t('map.edge.labelInput')}
              onSave={(next) => saveLabel(p.id, next)}
            />
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
});
