'use client';

import { memo, useContext } from 'react';
import { BaseEdge, EdgeLabelRenderer, getBezierPath, Position, useInternalNode, type EdgeProps } from '@xyflow/react';
import { withStrings } from '@remoa/strings';
import * as more from '@remoa/strings/ns';
import { MapEdgeLabel } from '@remoa/ui';
import { floatingEnds } from '../../canvas/link-edge';
import type { LinkEdge } from '../../canvas/graph';
import { MobileNodesContext } from './mobile-nodes-context';
import { useIsOverview } from './semantic-zoom';

const t = withStrings({ map: more.map, mapMobile: more.mapMobile });

type Box = { x: number; y: number; w: number; h: number };

/**
 * D-1572: lados esquerdo/direito sempre que os cards estão em colunas diferentes (os mapas prontos são em colunas, D-1565);
 * em cima/embaixo só quando um está sobre o outro. Sem isso, um card distante na vertical saía por baixo e cruzava a própria coluna.
 */
export function mobileEnds(a: Box, b: Box) {
  const right = b.x >= a.x + a.w;
  if (!right && b.x + b.w > a.x) return floatingEnds(a, b);
  return {
    sourceX: right ? a.x + a.w : a.x, sourceY: a.y + a.h / 2, sourcePosition: right ? Position.Right : Position.Left,
    targetX: right ? b.x : b.x + b.w, targetY: b.y + b.h / 2, targetPosition: right ? Position.Left : Position.Right,
  };
}

const COLOR = 'var(--state-unknown-soft)';
const HOT = 'var(--primary)';
/** Visão geral (< 80%, `MapaMobileVisao`): sem seta e traço que continua ≈ 2,2 px na tela a 60% (o mock não escala a linha). */
const OVERVIEW_WIDTH = { base: 3.6, hot: 5 };

/**
 * Conexão do mapa no celular, com seta. Curva própria de card a card (D-1572): a rota ortogonal do mock passava todas pelo meio entre as
 * colunas, e as linhas se sobrepunham sem mostrar quem liga a quem; cruzamentos inevitáveis viram um X legível. As do card selecionado: cor da marca e
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
  const e = a && b ? mobileEnds(a, b) : p;
  const [d, lx, ly] = getBezierPath(e);
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
