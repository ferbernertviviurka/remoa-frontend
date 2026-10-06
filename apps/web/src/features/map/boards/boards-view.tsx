'use client';

import { PendingLink } from '@/features/shell/nav-pending';
import { useNavigate } from '@/features/shell/use-navigate';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import type { Board, BoardSummary } from '@remoa/contracts';
import { t, type StringKey } from '@remoa/strings';
import { Button, Card, Dialog, FilterChip, Icon, Input, LockedSlideCard, MapTile, Menu, NewMapSlideCard, Pill, Segmented, StateBar, useToast, ViewToggle } from '@remoa/ui';
import { api } from '@/lib/api';
import { track } from '@/lib/analytics';
import { useEntitlements } from '@/features/shell/entitlements';
import { usePaywall } from '@/features/billing/paywall';
import { fold, savedAgo } from './saved-ago';

type Modal = { kind: 'rename' | 'archive' | 'delete'; board: BoardSummary } | null;
type Row = { b: BoardSummary; area: string; saved: string; due: { text: string; tone: 'review' | 'unknown' } };

type Status = 'active' | 'archived' | 'all';

export function BoardsView({ boards: activeBoards }: { boards: BoardSummary[] }) {
  const [navigating, router] = useNavigate();
  const paywall = usePaywall();
  const { toast } = useToast();
  const [modal, setModal] = useState<Modal>(null);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [undo, setUndo] = useState<BoardSummary | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [view, setView] = useState('grid');
  const [area, setArea] = useState('all');
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<Status>('active');
  const [fetched, setFetched] = useState<BoardSummary[]>([]);
  // G14 D-573: "Ativos" is the server-rendered list; the other filters read `?status=` and reload after every change.
  const loadStatus = useCallback(async (st: Status) => {
    if (st === 'active') return;
    const r = await api<BoardSummary[]>(`/v1/boards?status=${st}&include=preview`);
    if (r.ok) setFetched(r.data);
  }, []);
  const boards = status === 'active' ? activeBoards : fetched;
  useEffect(() => void loadStatus(status), [status, loadStatus]);
  const { entitlements, refresh } = useEntitlements();
  useEffect(() => void refresh(), [refresh]); // maps created/archived elsewhere change usage.boards; the shell copy is only the layout's first read
  // F14 FR-20/21 (D-108/D-112): null limit = unlimited; no entitlements (error) = behave as before, no lock.
  const max = entitlements?.limits.boards ?? null;
  const left = entitlements && max !== null ? Math.max(0, max - entitlements.usage.boards) : null;
  const free = left !== null;
  const canCreate = left === null || left > 0;
  const locked = free && !canCreate;
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  /** Runs a mutation; on failure shows the API error, on success refreshes the list + sidebar. */
  async function run<T>(call: () => Promise<{ ok: true; data: T } | { ok: false; error: { code: string; message?: string } }>): Promise<T | null> {
    setBusy(true);
    setError(null);
    try {
      const r = await call();
      if (!r.ok) {
        if (!paywall.handle(r.error)) setError(t(`errors.${r.error.code}` as StringKey));
        return null;
      }
      router.refresh();
      void loadStatus(status);
      return r.data;
    } catch {
      setError(t('errors.internal'));
      return null;
    } finally {
      setBusy(false);
    }
  }

  const patch = (id: string, body: object) => api<Board>(`/v1/boards/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
  const openModal = (m: Modal, initial = '') => {
    setModal(m);
    setName(initial);
    setError(null);
  };

  async function onRename(e: FormEvent) {
    e.preventDefault();
    if (modal?.kind !== 'rename') return;
    if (await run(() => patch(modal.board.id, { title: name }))) setModal(null);
  }

  async function onArchive() {
    if (modal?.kind !== 'archive') return;
    const board = modal.board;
    if (await run(() => patch(board.id, { archived: true }))) {
      setModal(null);
      setUndo(board);
      toast({ title: t('boards.archived') });
    }
  }

  async function onDelete() {
    if (modal?.kind !== 'delete') return;
    const board = modal.board;
    if (name.trim() !== board.title.trim()) return;
    if (await run(() => api<{ id: string }>(`/v1/boards/${board.id}`, { method: 'DELETE' }))) {
      setModal(null);
      toast({ title: t('boards.deleted') });
    }
  }

  async function onUnarchive(b: BoardSummary) {
    if (await run(() => patch(b.id, { archived: false }))) toast({ title: t('boards.unarchived') });
  }

  async function onUndo() {
    if (!undo) return;
    if (await run(() => patch(undo.id, { archived: false }))) setUndo(null);
  }

  async function onDuplicate(b: BoardSummary) {
    const title = t('boards.duplicateTitle', { title: b.title });
    if (await run(() => api<Board>(`/v1/boards/${b.id}/duplicate`, { method: 'POST', body: JSON.stringify({ title }) }))) {
      toast({ title: t('boards.duplicated') });
    }
  }

  const close = (o: boolean) => {
    if (!o) setModal(null);
  };
  const errorText = error ? <p role="alert" className="text-xs font-semibold text-review">{error}</p> : null;
  const goNew = () => router.push('/app/mapas/novo');
  const goUpgrade = () => {
    track('upgrade_clicked', { source: 'library_lock' });
    router.push('/app/planos?de=library_lock');
  };

  const areas = [...new Set(boards.map((b) => b.area))];
  const key = fold(q.trim());
  const shown = boards.filter((b) => (area === 'all' || b.area === area) && (!key || fold(b.title).includes(key)));
  const rows: Row[] = shown.map((b) => ({
    b,
    area: t(`boards.area.${b.area}` as StringKey),
    saved: savedAgo(b.updatedAt, now),
    due: b.dueCount > 0 ? { text: t('library.dueToday', { n: b.dueCount }), tone: 'review' } : { text: t('library.dueToday', { n: 0 }), tone: 'unknown' },
  }));
  const summary = t('library.summary', {
    n: shown.length,
    cards: shown.reduce((n, b) => n + b.cardCount, 0),
    due: shown.reduce((n, b) => n + b.dueCount, 0),
  });
  const menu = (b: BoardSummary) => (
    <Menu
      label={t('boards.menu', { title: b.title })}
      trigger="icon"
      icon={<span>⋯</span>}
      align="end"
      items={[
        { label: t('boards.rename'), onSelect: () => openModal({ kind: 'rename', board: b }, b.title) },
        { label: t('boards.duplicate'), onSelect: () => void onDuplicate(b) },
        b.archivedAt
          ? { label: t('boards.unarchive'), onSelect: () => void onUnarchive(b) }
          : { label: t('boards.archive'), onSelect: () => openModal({ kind: 'archive', board: b }) },
        { label: t('boards.delete'), onSelect: () => openModal({ kind: 'delete', board: b }) },
      ]}
    />
  );
  /** FR-19: shown only when the map is not "Só eu". */
  const accessBadge = (b: BoardSummary) =>
    b.archivedAt ? <Pill tone="unknown">{t('boards.archivedBadge')}</Pill> : b.access === 'owner' ? null : (
      <Pill tone={b.access === 'password' ? 'watch' : 'brand'}>
        <Icon name={b.access === 'password' ? 'lock' : 'link'} size={14} aria-hidden="true" />
        <span className="ml-1.5">{t(`boardsAccess.${b.access}`)}</span>
      </Pill>
    );
  const barLabel = (b: BoardSummary) => t('boards.stateBarLabel', b.stateCounts);
  const dueBadge = ({ due }: Row) => (
    <span className={`rounded-pill px-2.5 py-[3px] text-[13px] font-bold ${due.tone === 'review' ? 'bg-review-bg text-review-text' : 'bg-unknown-bg text-unknown-text'}`}>{due.text}</span>
  );
  const cols = 'lg:grid lg:grid-cols-[minmax(0,2.2fr)_minmax(0,1.3fr)_minmax(0,1.6fr)_90px_130px_120px] lg:items-center lg:gap-4';

  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 md:px-6 md:py-[13px]">
      <div className="flex flex-wrap items-end justify-between gap-4 md:gap-6">
        <div className="flex flex-col gap-2">
          <span className="text-xs font-bold uppercase tracking-[.12em] text-muted">{t('library.eyebrow')}</span>
          <h1 className="font-display text-[34px] font-extrabold leading-[1.1] tracking-[-0.035em] text-ink md:text-[46px] md:leading-[1.05]">{t('library.title')}</h1>
          <p className="text-[15px] text-muted">{summary}</p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-3 md:w-auto">
          <Input variant="search" label={t('library.searchPlaceholder')} placeholder={t('library.searchPlaceholder')} value={q} onChange={(e) => setQ(e.target.value)} />
          <ViewToggle
            aria-label={t('library.stateLabel')}
            value={view}
            onValueChange={setView}
            options={[
              { value: 'grid', label: t('library.viewGrid'), icon: 'grid' },
              { value: 'list', label: t('library.viewList'), icon: 'list' },
            ]}
          />
          <Button variant={locked ? 'secondary' : 'primary'} icon={locked ? <Icon name="lock" size={20} /> : <Icon name="plus" size={20} />} onClick={locked ? goUpgrade : goNew}>{t('library.newMapButton')}</Button>
        </div>
      </div>

      <Segmented
        aria-label={t('boards.statusLabel')}
        value={status}
        onValueChange={(v) => setStatus(v as Status)}
        options={[
          { value: 'active', label: t('boards.statusActive') },
          { value: 'archived', label: t('boards.statusArchived') },
          { value: 'all', label: t('boards.statusAll') },
        ]}
      />

      <div role="group" aria-label={t('library.filterArea')} className="flex flex-wrap gap-2.5">
        <FilterChip pressed={area === 'all'} count={boards.length} onClick={() => setArea('all')}>{t('library.all')}</FilterChip>
        {areas.map((a) => (
          <FilterChip key={a} pressed={area === a} count={boards.filter((b) => b.area === a).length} onClick={() => setArea(a)}>
            {t(`boards.area.${a}` as StringKey)}
          </FilterChip>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-list border-[1.5px] border-dashed border-border-strong bg-surface px-6 py-14 text-center">
          <h2 className="font-display text-2xl font-extrabold tracking-[-0.02em] text-ink">{status === 'archived' ? t('boards.emptyArchived') : t('library.noMaps')}</h2>
          <p className="text-muted">{t('library.noMapsDesc')}</p>
          <Button onClick={goNew}>{t('library.newMapButton')}</Button>
        </div>
      ) : view === 'grid' ? (
        <ul className="m-0 grid list-none grid-cols-1 gap-[22px] p-0 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((r) => (
            <li key={r.b.id} className="relative">
              <MapTile
                as={PendingLink}
                href={`/app/mapas/${r.b.id}`}
                aria-label={t('boards.open', { title: r.b.title })}
                size="md"
                area={r.area}
                title={r.b.title}
                preview={r.b.preview}
                counts={r.b.stateCounts}
                stateBarLabel={barLabel(r.b)}
                meta={t('library.cardMeta', { cards: r.b.cardCount, edges: r.b.edgeCount })}
                due={r.due}
                saved={t('library.saved', { time: r.saved })}
              />
              <div className="absolute right-6 top-6 rounded-btn bg-surface/85">{menu(r.b)}</div>
              <div className="pointer-events-none absolute left-6 top-6">{accessBadge(r.b)}</div>
            </li>
          ))}
          {area === 'all' && !key && entitlements ? (
            <>
              {canCreate ? (
                <li>
                  <NewMapSlideCard
                    as={PendingLink}
                    href="/app/mapas/novo"
                    aria-label={t('home.slider.newCard.aria')}
                    title={t('home.slider.newCard.title')}
                    text={free ? t('home.slider.newCard.freeRemaining', { n: left }) : t('home.slider.newCard.text')}
                  />
                </li>
              ) : null}
              {free ? (
                <li>
                  <LockedSlideCard
                    title={t('home.slider.lockedCard.title')}
                    text={t('home.slider.lockedCard.text', { max: max ?? 0 })}
                    cta={
                      <PendingLink
                        href="/app/planos?de=library_lock"
                        onClick={() => track('upgrade_clicked', { source: 'library_lock' })}
                        className="flex items-center justify-center gap-2 rounded-[13px] bg-primary text-sm font-bold text-on-primary no-underline"
                      >
                        <Icon name="sparkle" size={16} />
                        {t('nav.upgradeButton')}
                      </PendingLink>
                    }
                  />
                </li>
              ) : null}
            </>
          ) : null}
        </ul>
      ) : (
        <div className="overflow-hidden rounded-list border border-border bg-surface">
          <div className={`${cols} hidden border-b border-border bg-canvas px-6 py-3.5 pr-16 text-xs font-bold uppercase tracking-[.12em] text-muted`}>
            <span>{t('library.columns.map')}</span>
            <span>{t('library.columns.area')}</span>
            <span>{t('library.columns.states')}</span>
            <span>{t('library.columns.cards')}</span>
            <span>{t('library.columns.today')}</span>
            <span>{t('library.columns.saved')}</span>
          </div>
          <ul className="m-0 list-none p-0">
            {rows.map((r) => (
              <li key={r.b.id} className="relative border-b border-divider last:border-b-0">
                <PendingLink href={`/app/mapas/${r.b.id}`} aria-label={t('boards.open', { title: r.b.title })} className={`${cols} flex min-h-14 flex-wrap items-center gap-x-3 gap-y-2 px-4 py-4 pr-16 text-ink no-underline hover:bg-primary-tint lg:px-6`}>
                  <span className="basis-full font-display text-lg font-bold tracking-[-0.02em] lg:basis-auto">{r.b.title} {accessBadge(r.b)}</span>
                  <span className="text-muted">{r.area}</span>
                  <span className="order-last basis-full lg:order-none lg:basis-auto"><StateBar counts={r.b.stateCounts} aria-label={barLabel(r.b)} /></span>
                  <span className="font-bold max-lg:hidden">{r.b.cardCount}</span>
                  <span>{dueBadge(r)}</span>
                  <span className="text-[13px] text-muted">{r.saved}</span>
                </PendingLink>
                <div className="absolute right-3 top-1/2 -translate-y-1/2">{menu(r.b)}</div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {undo ? (
        <div role="status">
          <Card>
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-semibold">{t('boards.archived')}: {undo.title}</span>
              <Button variant="secondary" disabled={busy || navigating} onClick={() => void onUndo()}>{t('boards.undo')}</Button>
            </div>
            {errorText}
          </Card>
        </div>
      ) : null}

      <Dialog open={modal?.kind === 'rename'} onOpenChange={close} title={t('boards.renameTitle')} closeLabel={t('common.close')}>
        <form onSubmit={(e) => void onRename(e)} className="flex flex-col gap-3">
          <Input label={t('boards.titleLabel')} placeholder={t('boards.titlePlaceholder')} value={name} onChange={(e) => setName(e.target.value)} maxLength={120} required autoFocus />
          {errorText}
          <Button type="submit" loading={busy || navigating} loadingLabel={t('common.loading')} disabled={!name.trim()}>{t('boards.rename')}</Button>
        </form>
      </Dialog>

      <Dialog
        open={modal?.kind === 'delete'}
        onOpenChange={close}
        title={t('boards.deleteTitle', { title: modal?.kind === 'delete' ? modal.board.title : '' })}
        description={t('boards.deleteBody')}
        closeLabel={t('common.close')}
      >
        <form onSubmit={(e) => { e.preventDefault(); void onDelete(); }} className="flex flex-col gap-3">
          <Input label={t('boards.deleteConfirmLabel')} value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" autoFocus />
          {errorText}
          <Button type="submit" variant="danger" loading={busy || navigating} loadingLabel={t('common.loading')} disabled={modal?.kind !== 'delete' || name.trim() !== modal.board.title.trim()}>{t('boards.delete')}</Button>
        </form>
      </Dialog>

      <Dialog
        open={modal?.kind === 'archive'}
        onOpenChange={close}
        title={t('boards.archiveTitle', { title: modal?.kind === 'archive' ? modal.board.title : '' })}
        description={t('boards.archiveBody')}
        closeLabel={t('common.close')}
      >
        <div className="flex flex-col gap-3">
          {errorText}
          <Button variant="danger" loading={busy || navigating} loadingLabel={t('common.loading')} onClick={() => void onArchive()}>{t('boards.archive')}</Button>
        </div>
      </Dialog>
    </div>
  );
}
