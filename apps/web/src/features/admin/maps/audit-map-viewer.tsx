'use client';

import dynamic from 'next/dynamic';
import type { BoardGraph, SharedBoard } from '@remoa/contracts';
import { t } from '@remoa/strings';
import { Dialog } from '@remoa/ui';

// Same read-only React Flow canvas as the public shared map (/m/[token]); it also loads the editor css it needs.
const SharedCanvas = dynamic(() => import('@/app/(public)/m/[token]/shared-canvas').then((m) => m.SharedCanvas), { ssr: false });

// POST /maps/:id/open answers `graph: unknown` (contracts); at runtime it is the BoardGraph the editor loads.
const isGraph = (g: unknown): g is BoardGraph => typeof g === 'object' && g !== null && Array.isArray((g as BoardGraph).cards) && Array.isArray((g as BoardGraph).edges);

/** FR-15 "modo auditoria": the map's cards and connections, no way to edit. The audit id is already recorded. */
export function AuditMapViewer({ graph, title, auditId, onClose }: { graph: unknown; title: string; auditId: string; onClose: () => void }) {
  const g = isGraph(graph) ? graph : null;
  // ponytail: the shared canvas only reads title/cards/edges; the BoardGraph cards are a superset of SharedCard.
  const board = g ? ({ title, cards: g.cards, edges: g.edges } as unknown as SharedBoard) : null;
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} size="full" title={title} description={t('admin.maps.audit.canvasLabel')} closeLabel={t('admin.maps.audit.close')}>
      <p role="status" className="m-0 mb-3 rounded-2xl bg-watch-bg px-4 py-3 text-sm font-bold text-watch-text">{t('admin.maps.audit.banner', { id: auditId })}</p>
      <div className="min-h-0 flex-1 overflow-hidden rounded-[20px] border border-border bg-canvas">
        {board && board.cards.length ? <SharedCanvas board={board} /> : <p className="m-0 p-6 text-muted">{t('admin.maps.audit.empty')}</p>}
      </div>
    </Dialog>
  );
}
