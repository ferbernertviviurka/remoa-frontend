'use client';

// F23 T8 (FR-15/FR-16, MapaMobileMenu.dc.html): content of the phone map's aside. The shell is `MapAside` (T3); here the real
// data: progress from the same heat as the map, layers through the prefs, favorite per device (D-665), map actions with the
// dialogs of Meus mapas, share (F17), support (F19) and details.
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Board, Card, CoverageRow, MobileMapPrefs, RetrievabilityMap } from '@remoa/contracts';
import { withStrings } from '@remoa/strings';
import * as more from '@remoa/strings/ns';
import { Button, Dialog, Input, MapAside, NavRow, ProgressSummary, ToggleRow, useToast } from '@remoa/ui';
import { usePaywall } from '@/features/billing/paywall';
import { ShareDialog } from '@/features/map/share/share-dialog';
import { useEntitlements } from '@/features/shell/entitlements';
import { openSupport } from '@/features/support';
import { api } from '@/lib/api';
import { MapThumb } from './map-preview';
import { summarize } from './priority';

const t = withStrings({ boards: more.boards, mapMobile: more.mapMobile });
type StringKey = Parameters<typeof t>[0];

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  board: Board;
  cards: readonly Card[];
  nodes: readonly { id: string; x: number; y: number }[];
  edgeCount: number;
  heat: RetrievabilityMap;
  prefs: MobileMapPrefs;
  onPrefs: (fn: (p: MobileMapPrefs) => MobileMapPrefs) => void;
  dueCount: number;
  onReview: () => void;
  onFit: () => void;
  onCreate: () => void;
};

const date = (d: Date) => new Date(d).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
type Modal = 'archive' | 'delete' | null;

export function MobileMapMenu({ open, onOpenChange, board, cards, nodes, edgeCount, heat, prefs, onPrefs, dueCount, onReview, onFit, onCreate }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const paywall = usePaywall();
  const { entitlements: ent } = useEntitlements();
  const [coverage, setCoverage] = useState<CoverageRow | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [modal, setModal] = useState<Modal>(null);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!board.matrixItemId) return;
    let live = true;
    api<CoverageRow[]>('/v1/coverage')
      .then((r) => live && r.ok && setCoverage(r.data.find((row) => row.matrixItemId === board.matrixItemId) ?? null))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [board.matrixItemId]);

  const { average, counts } = useMemo(() => summarize(cards, heat), [cards, heat]);
  const thumb = useMemo(() => {
    const at = new Map(nodes.map((n) => [n.id, n]));
    return cards.flatMap((c) => {
      const n = at.get(c.id);
      return n ? [{ x: n.x, y: n.y, state: heat[c.id]?.state ?? ('unknown' as const) }] : [];
    });
  }, [cards, nodes, heat]);

  const favorite = prefs.favorites.includes(board.id);
  const toggleFavorite = (on: boolean) =>
    onPrefs((p) => ({ ...p, favorites: on ? [...p.favorites.filter((id) => id !== board.id), board.id].slice(-200) : p.favorites.filter((id) => id !== board.id) }));
  const close = () => onOpenChange(false);
  const then = (fn: () => void) => () => {
    close();
    fn();
  };

  async function mutate<T>(call: () => Promise<{ ok: true; data: T } | { ok: false; error: { code: string; message?: string } }>): Promise<T | null> {
    setBusy(true);
    setError(null);
    try {
      const r = await call();
      if (r.ok) return r.data;
      if (!paywall.handle(r.error)) setError(t(`errors.${r.error.code}` as StringKey));
    } catch {
      setError(t('errors.internal'));
    } finally {
      setBusy(false);
    }
    return null;
  }
  async function duplicate() {
    close();
    const copy = await mutate(() => api<Board>(`/v1/boards/${board.id}/duplicate`, { method: 'POST', body: JSON.stringify({ title: t('boards.duplicateTitle', { title: board.title }) }) }));
    if (copy) {
      toast({ title: t('boards.duplicated') });
      router.push(`/app/mapas/${copy.id}`);
    } else toast({ title: t('errors.internal'), tone: 'danger' });
  }
  async function archive() {
    if (await mutate(() => api<Board>(`/v1/boards/${board.id}`, { method: 'PATCH', body: JSON.stringify({ archived: true }) }))) {
      setModal(null);
      toast({ title: t('boards.archived') });
      router.push('/app/mapas');
    }
  }
  async function remove() {
    if (name.trim() !== board.title.trim()) return;
    if (await mutate(() => api<{ id: string }>(`/v1/boards/${board.id}`, { method: 'DELETE' }))) {
      setModal(null);
      toast({ title: t('boards.deleted') });
      router.push('/app/mapas');
    }
  }
  const ask = (m: Modal) => () => {
    close();
    setName('');
    setError(null);
    setModal(m);
  };

  const canShare = board.status === 'private' && !board.archivedAt;
  const aiOn = !ent || ent.limits.ai_generations !== 0;
  const aiLeft = ent && ent.limits.ai_generations !== null ? Math.max(0, ent.limits.ai_generations - ent.usage.ai_generations) : null;
  const cardLimit = ent?.limits.cards ?? null;
  const stats = t('mapMobile.asideContent.stats', { cards: cards.length, edges: edgeCount });
  const owner = t('mapMobile.asideContent.ownerYou');

  return (
    <>
      <MapAside
        open={open}
        onOpenChange={onOpenChange}
        label={t('mapMobile.aside.ariaLabel')}
        closeLabel={t('mapMobile.aside.closeLabel')}
        backLabel={t('mapMobile.aside.backTo')}
        backHref="/app/mapas"
        title={board.title}
        subtitle={t('mapMobile.asideContent.ownerLine', { area: t(`boards.area.${board.area}`), access: board.access === 'owner' ? t('mapMobile.asideContent.onlyYou') : t(`boardsAccess.${board.access}`) })}
        ownerInitial={owner.charAt(0)}
        favorite={{ label: favorite ? t('mapMobile.asideContent.unfavorite') : t('mapMobile.asideContent.favorite'), pressed: favorite, onToggle: toggleFavorite }}
        preview={{ node: <MapThumb nodes={thumb} />, label: t('mapMobile.asideContent.mapPreview'), caption: t('mapMobile.asideContent.viewFull'), onClick: then(onFit) }}
        progress={
          <ProgressSummary
            title={t('mapMobile.asideContent.progressTitle')}
            countLabel={cardLimit === null ? t('mapMobile.list.countLabel', { n: cards.length }) : t('mapMobile.asideContent.usage', { used: cards.length, limit: cardLimit })}
            average={average}
            averageLabel={t('mapMobile.asideContent.avgRetrievability')}
            segments={[
              { state: 'review', count: counts.review, label: t('mapMobile.asideContent.segmentReview') },
              { state: 'watch', count: counts.watch, label: t('mapMobile.asideContent.segmentWatch') },
              { state: 'steady', count: counts.steady, label: t('mapMobile.asideContent.segmentSteady') },
              { state: 'unknown', count: counts.unknown, label: t('mapMobile.asideContent.segmentUnknown') },
            ]}
            coverage={coverage ? t('editor.coversHeader', { pct: Math.round(coverage.coverage), item: coverage.title }) : undefined}
            reviewLabel={dueCount > 0 ? t('mapMobile.asideContent.reviewMapLabel', { n: dueCount }) : t('mapMobile.floatingBar.reviewNoDueLabel')}
            onReview={then(onReview)}
          />
        }
        detailsTitle={t('mapMobile.asideContent.detailsTitle')}
        details={[
          { label: t('mapMobile.asideContent.owner'), value: owner },
          { label: t('mapMobile.asideContent.created'), value: date(board.createdAt) },
          { label: t('mapMobile.asideContent.lastEdited'), value: date(board.updatedAt) },
          { label: t('mapMobile.asideContent.area'), value: t(`boards.area.${board.area}`) },
          { label: t('mapMobile.asideContent.contentLabel'), value: stats },
        ]}
      >
        <NavRow icon="list" label={t('mapMobile.asideContent.listMode')} description={t('mapMobile.asideContent.listModeBody')} onClick={then(() => onPrefs((p) => ({ ...p, view: 'list' })))} />
        <ToggleRow icon="target" label={t('mapMobile.asideContent.heatmap')} description={t('mapMobile.asideContent.heatmapBody')} checked={prefs.heat} onCheckedChange={(v) => onPrefs((p) => ({ ...p, heat: v }))} />
        <ToggleRow icon="link" label={t('mapMobile.asideContent.labels')} description={t('mapMobile.asideContent.labelsBody')} checked={prefs.labels} onCheckedChange={(v) => onPrefs((p) => ({ ...p, labels: v }))} />
        <NavRow icon="fit" label={t('mapMobile.asideContent.fitScreen')} onClick={then(onFit)} />
        {canShare ? <NavRow icon="share" label={t('mapMobile.asideContent.share')} description={t('mapMobile.asideContent.shareBody')} onClick={then(() => setShareOpen(true))} /> : null}
        {aiOn ? (
          <NavRow icon="sparkle" label={t('mapMobile.asideContent.genAi')} description={aiLeft === null ? t('mapMobile.asideContent.genAiPro') : t('mapMobile.asideContent.genAiFree', { n: aiLeft })} onClick={then(onCreate)} />
        ) : null}
        <NavRow icon="copy" label={t('boards.duplicate')} onClick={() => void duplicate()} />
        <NavRow icon="archive" label={t('boards.archive')} onClick={ask('archive')} />
        <NavRow icon="trash" label={t('boards.delete')} onClick={ask('delete')} />
        <NavRow icon="store" label={t('mapMobile.asideContent.shop')} description={t('mapMobile.asideContent.shopSub')} soon={t('mapMobile.asideContent.shopSoon')} />
        <NavRow icon="lifebuoy" label={t('mapMobile.asideContent.support')} onClick={then(() => openSupport('mobile_nav'))} />
      </MapAside>

      {canShare ? <ShareDialog board={board} open={shareOpen} onOpenChange={setShareOpen} /> : null}

      <Dialog open={modal === 'archive'} onOpenChange={(o) => !o && setModal(null)} title={t('boards.archiveTitle', { title: board.title })} description={t('boards.archiveBody')} closeLabel={t('common.close')}>
        <div className="flex flex-col gap-3">
          {error ? <p role="alert" className="m-0 text-sm text-review-text">{error}</p> : null}
          <Button variant="danger" loading={busy} loadingLabel={t('common.loading')} onClick={() => void archive()}>{t('boards.archive')}</Button>
        </div>
      </Dialog>
      <Dialog open={modal === 'delete'} onOpenChange={(o) => !o && setModal(null)} title={t('boards.deleteTitle', { title: board.title })} description={t('boards.deleteBody')} closeLabel={t('common.close')}>
        <form onSubmit={(e) => { e.preventDefault(); void remove(); }} className="flex flex-col gap-3">
          <Input label={t('boards.deleteConfirmLabel')} value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" autoFocus />
          {error ? <p role="alert" className="m-0 text-sm text-review-text">{error}</p> : null}
          <Button type="submit" variant="danger" loading={busy} loadingLabel={t('common.loading')} disabled={name.trim() !== board.title.trim()}>{t('boards.delete')}</Button>
        </form>
      </Dialog>
    </>
  );
}
