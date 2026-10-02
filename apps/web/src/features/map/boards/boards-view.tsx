'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import type { Board, BoardSummary } from '@remoa/contracts';
import { t, type StringKey } from '@remoa/strings';
import { Button, Card, Dialog, FilterChip, Icon, Input, MapTile, Menu, StateBar, useToast, ViewToggle } from '@remoa/ui';
import { api } from '@/lib/api';
import { fold, savedAgo } from './saved-ago';

type Modal = { kind: 'rename' | 'archive'; board: BoardSummary } | null;
type Row = { b: BoardSummary; area: string; saved: string; due: { text: string; tone: 'review' | 'unknown' } };

export function BoardsView({ boards }: { boards: BoardSummary[] }) {
  const router = useRouter();
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
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  /** Runs a mutation; on failure shows the API error, on success refreshes the list + sidebar. */
  async function run<T>(call: () => Promise<{ ok: true; data: T } | { ok: false; error: { code: string } }>): Promise<T | null> {
    setBusy(true);
    setError(null);
    try {
      const r = await call();
      if (!r.ok) {
        setError(t(`errors.${r.error.code}` as StringKey));
        return null;
      }
      router.refresh();
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
  const goNew = () => router.push('/mapas/novo');

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
        { label: t('boards.archive'), onSelect: () => openModal({ kind: 'archive', board: b }) },
      ]}
    />
  );
  const barLabel = (b: BoardSummary) => t('boards.stateBarLabel', b.stateCounts);
  const dueBadge = ({ due }: Row) => (
    <span className={`rounded-pill px-2.5 py-[3px] text-[13px] font-bold ${due.tone === 'review' ? 'bg-review-bg text-review-text' : 'bg-unknown-bg text-unknown-text'}`}>{due.text}</span>
  );
  const cols = 'grid grid-cols-[minmax(0,2.2fr)_minmax(0,1.3fr)_minmax(0,1.6fr)_90px_130px_120px] items-center gap-4';

  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 md:px-6 md:py-[13px]">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="flex flex-col gap-2">
          <span className="text-xs font-bold uppercase tracking-[.12em] text-muted">{t('library.eyebrow')}</span>
          <h1 className="font-display text-[46px] font-extrabold leading-[1.05] tracking-[-0.035em] text-ink">{t('library.title')}</h1>
          <p className="text-[15px] text-muted">{summary}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
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
          <Button icon={<Icon name="plus" size={20} />} onClick={goNew}>{t('library.newMapButton')}</Button>
        </div>
      </div>

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
          <h2 className="font-display text-2xl font-extrabold tracking-[-0.02em] text-ink">{t('library.noMaps')}</h2>
          <p className="text-muted">{t('library.noMapsDesc')}</p>
          <Button onClick={goNew}>{t('library.newMapButton')}</Button>
        </div>
      ) : view === 'grid' ? (
        <ul className="m-0 grid list-none grid-cols-1 gap-[22px] p-0 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((r) => (
            <li key={r.b.id} className="relative">
              <MapTile
                as={Link}
                href={`/mapas/${r.b.id}`}
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
            </li>
          ))}
        </ul>
      ) : (
        <div className="overflow-hidden rounded-list border border-border bg-surface">
          <div className={`${cols} border-b border-border bg-canvas px-6 py-3.5 pr-16 text-xs font-bold uppercase tracking-[.12em] text-muted`}>
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
                <Link href={`/mapas/${r.b.id}`} aria-label={t('boards.open', { title: r.b.title })} className={`${cols} px-6 py-4 pr-16 text-ink no-underline hover:bg-primary-tint`}>
                  <span className="font-display text-lg font-bold tracking-[-0.02em]">{r.b.title}</span>
                  <span className="text-muted">{r.area}</span>
                  <StateBar counts={r.b.stateCounts} aria-label={barLabel(r.b)} />
                  <span className="font-bold">{r.b.cardCount}</span>
                  <span>{dueBadge(r)}</span>
                  <span className="text-[13px] text-muted">{r.saved}</span>
                </Link>
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
              <Button variant="secondary" disabled={busy} onClick={() => void onUndo()}>{t('boards.undo')}</Button>
            </div>
            {errorText}
          </Card>
        </div>
      ) : null}

      <Dialog open={modal?.kind === 'rename'} onOpenChange={close} title={t('boards.renameTitle')} closeLabel={t('common.close')}>
        <form onSubmit={(e) => void onRename(e)} className="flex flex-col gap-3">
          <Input label={t('boards.titleLabel')} placeholder={t('boards.titlePlaceholder')} value={name} onChange={(e) => setName(e.target.value)} maxLength={120} required autoFocus />
          {errorText}
          <Button type="submit" loading={busy} loadingLabel={t('common.loading')} disabled={!name.trim()}>{t('boards.rename')}</Button>
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
          <Button variant="danger" loading={busy} loadingLabel={t('common.loading')} onClick={() => void onArchive()}>{t('boards.archive')}</Button>
        </div>
      </Dialog>
    </div>
  );
}
