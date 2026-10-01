'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import type { Board, BoardSummary } from '@remoa/contracts';
import { t, type StringKey } from '@remoa/strings';
import { Button, Card, Dialog, Eyebrow, Input, useToast } from '@remoa/ui';
import { track } from '@/lib/analytics';
import { api } from '@/lib/api';
import { EmptyState } from '@/features/shell/empty-state';

const date = (iso: Date | string) => new Date(iso).toLocaleDateString('pt-BR', { dateStyle: 'medium' });

type Modal = { kind: 'create' } | { kind: 'rename' | 'archive'; board: BoardSummary } | null;

export function BoardsView({ boards }: { boards: BoardSummary[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [modal, setModal] = useState<Modal>(null);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [undo, setUndo] = useState<BoardSummary | null>(null);

  const open = (m: Modal, initial = '') => {
    setModal(m);
    setName(initial);
    setError(null);
  };

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

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    const board = await run(() => api<Board>('/v1/boards', { method: 'POST', body: JSON.stringify({ title: name }) }));
    if (!board) return;
    track('board_created', {});
    router.push(`/mapas/${board.id}`);
  }

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
  const nameInput = <Input label={t('boards.titleLabel')} placeholder={t('boards.titlePlaceholder')} value={name} onChange={(e) => setName(e.target.value)} maxLength={120} required autoFocus />;

  const groups = [...new Set(boards.map((b) => b.area))];

  return (
    <div className="flex flex-col gap-6">
      {boards.length === 0 ? (
        <EmptyState title={t('empty.boards.title')} body={t('empty.boards.body')}>
          <Button variant="secondary" disabled title={t('common.comingSoon')}>{t('empty.boards.importPdf')}</Button>
          <Button variant="secondary" disabled title={t('common.comingSoon')}>{t('empty.boards.importAnki')}</Button>
          <Button variant="secondary" disabled title={t('common.comingSoon')}>{t('empty.boards.template')}</Button>
          <Button onClick={() => open({ kind: 'create' })}>{t('empty.boards.blank')}</Button>
        </EmptyState>
      ) : (
        <>
          <div className="flex items-center justify-between gap-3">
            <h1 className="font-display text-2xl font-extrabold text-text">{t('boards.title')}</h1>
            <Button onClick={() => open({ kind: 'create' })}>{t('boards.new')}</Button>
          </div>
          {groups.map((area) => (
            <section key={area} className="flex flex-col gap-3">
              <Eyebrow>{t(`boards.area.${area}` as StringKey)}</Eyebrow>
              <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {boards
                  .filter((b) => b.area === area)
                  .map((b) => (
                    <li key={b.id}>
                      <Card>
                        <div className="flex flex-col gap-2">
                          <Link href={`/mapas/${b.id}`} className="font-display text-lg font-bold text-text underline-offset-2 hover:underline">
                            {b.title}
                          </Link>
                          <p className="text-sm text-muted">{t('boards.counts', { cards: b.cardCount, edges: b.edgeCount })}</p>
                          <p className="text-xs text-muted">{t('boards.updated', { data: date(b.updatedAt) })}</p>
                          <div role="group" aria-label={t('boards.actions', { title: b.title })} className="flex flex-wrap gap-1">
                            <Button variant="quiet" onClick={() => open({ kind: 'rename', board: b }, b.title)}>{t('boards.rename')}</Button>
                            <Button variant="quiet" disabled={busy} onClick={() => void onDuplicate(b)}>{t('boards.duplicate')}</Button>
                            <Button variant="quiet" onClick={() => open({ kind: 'archive', board: b })}>{t('boards.archive')}</Button>
                          </div>
                        </div>
                      </Card>
                    </li>
                  ))}
              </ul>
            </section>
          ))}
        </>
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

      <Dialog open={modal?.kind === 'create'} onOpenChange={close} title={t('boards.new')} closeLabel={t('common.close')}>
        <form onSubmit={(e) => void onCreate(e)} className="flex flex-col gap-3">
          {nameInput}
          {errorText}
          <Button type="submit" disabled={busy || !name.trim()}>{t('boards.create')}</Button>
        </form>
      </Dialog>

      <Dialog open={modal?.kind === 'rename'} onOpenChange={close} title={t('boards.renameTitle')} closeLabel={t('common.close')}>
        <form onSubmit={(e) => void onRename(e)} className="flex flex-col gap-3">
          {nameInput}
          {errorText}
          <Button type="submit" disabled={busy || !name.trim()}>{t('boards.rename')}</Button>
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
          <Button variant="danger" disabled={busy} onClick={() => void onArchive()}>{t('boards.archive')}</Button>
        </div>
      </Dialog>
    </div>
  );
}
