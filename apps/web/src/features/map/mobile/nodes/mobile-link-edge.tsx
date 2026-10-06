'use client';

import { memo, useContext } from 'react';
import { BaseEdge, EdgeLabelRenderer, Position, useInternalNode, type EdgeProps } from '@xyflow/react';
import { withStrings } from '@remoa/strings';
import * as more from '@remoa/strings/ns';
import { MapEdgeLabel, routePoints, type Side } from '@remoa/ui';
import { floatingEnds } from '../../canvas/link-edge';
import type { LinkEdge } from '../../canvas/graph';
import { MobileNodesContext } from './mobile-nodes-context';
import { useIsOverview } from './semantic-zoom';

const t = withStrings({ map: more.map, mapMobile: more.mapMobile });

/** F23 FR-7: cantos de 12 px (o desktop usa 14). */
export const MOBILE_EDGE_RADIUS = 12;
const side: Record<Position, Side> = { [Position.Left]: 'l', [Position.Right]: 'r', [Position.Top]: 't', [Position.Bottom]: 'b' };
const COLOR = 'var(--state-unknown-soft)';
const HOT = 'var(--primary)';
/** Visão geral (< 80%, `MapaMobileVisao`): sem seta e traço que continua ≈ 2,2 px na tela a 60% (o mock não escala a linha). */
const OVERVIEW_WIDTH = { base: 3.6, hot: 5 };

/**
 * Conexão ortogonal do mapa no celular (`route()` de `MapaMobileMapa.dc.html`, raio 12), com seta. As do card selecionado: cor da marca e
 * 3 px (as demais 2,2 px). Rótulo 11,5 px; sem rótulo = "sem rótulo" em âmbar (Q-086). Rótulos somem na camada desligada e na visão
 * geral (< 80%, seletor booleano).
 */
export const MobileLinkEdge = memo(function MobileLinkEdge(p: EdgeProps<LinkEdge>) {
  const { selectedId, labels, editLabel } = useContext(MobileNodesContext);
  const overview = useIsOverview();
  const src = useInternalNode(p.source);
  const dst = useInternalNode(p.target);
  const box = (n: typeof src) => (n?.measured.width && n.measured.height ? { ...n.internals.positionAbsolute, w: n.measured.width, h: n.measured.height } : null);
  const a = box(src);
  const b = box(dst);
  const e = a && b ? floatingEnds(a, b) : p;
  const { d, lx, ly } = routePoints([e.sourceX, e.sourceY], side[e.sourcePosition], [e.targetX, e.targetY], MOBILE_EDGE_RADIUS);
  const hot = selectedId !== null && (p.source === selectedId || p.target === selectedId);
  const color = hot ? HOT : COLOR;
  const label = p.data?.label?.trim() || null;
  const marker = `mm-arrow-${p.id}`;
  return (
    <>
      {overview ? null : (
        <defs>
          <marker id={marker} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
            <path d="M 1 1 L 9 5 L 1 9 z" fill={color} />
          </marker>
        </defs>
      )}
      <BaseEdge id={p.id} path={d} markerEnd={overview ? undefined : `url(#${marker})`} style={{ stroke: color, strokeWidth: overview ? (hot ? OVERVIEW_WIDTH.hot : OVERVIEW_WIDTH.base) : hot ? 3 : 2.2, strokeLinecap: 'round', strokeLinejoin: 'round', transition: 'stroke .3s ease' }} />
      {labels && !overview ? (
        <EdgeLabelRenderer>
          <div className="nodrag nopan absolute" style={{ transform: `translate(-50%, -50%) translate(${lx}px, ${ly}px)`, pointerEvents: editLabel ? 'all' : 'none' }}>
            <MapEdgeLabel
              label={label ?? t('mapMobile.edge.noLabel')}
              empty={!label}
              hot={hot}
              {...(editLabel ? { onClick: () => editLabel(p.id), buttonLabel: label ? t('map.edge.editLabel', { label }) : t('map.edge.addLabel') } : {})}
            />
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
});
