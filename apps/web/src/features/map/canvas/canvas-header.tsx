'use client';

import { memo, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Board } from '@remoa/contracts';
import { boardTitleSchema } from '@remoa/contracts';
import { t, type StringKey } from '@remoa/strings';
import { Alert, Button, Icon, InlineTitle, Kbd, Segmented, useToast } from '@remoa/ui';
import { api } from '@/lib/api';
import type { QueueStatus } from './op-queue';

export type Mode = 'explore' | 'challenge';

/** "Salvo há 2 min" (D-086: the editor shows its own save state). `savedAt` null = nothing saved this session → board.updatedAt. */
export function saveText(status: Pick<QueueStatus, 'state' | 'savedAt'>, updatedAt: Date | string, now: number): string {
  if (status.state === 'saving') return t('editor.saving');
  if (status.state === 'offline') return t('map.save.offline');
  if (status.state === 'error') return t('map.save.error');
  const min = Math.max(0, Math.floor((now - (status.savedAt ?? new Date(updatedAt).getTime())) / 60_000));
  if (min < 1) return t('editor.savedNow');
  const time = min < 60 ? t('map.ago.minutes', { n: min }) : t('map.ago.hours', { n: Math.floor(min / 60) });
  return t('editor.savedLabel', { time });
}

function useNow(everyMs: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), everyMs);
    return () => clearInterval(id);
  }, [everyMs]);
  return now;
}

type Props = {
  board: Board;
  status: QueueStatus;
  onRetry: () => void;
  mode: Mode;
  onMode: (m: Mode) => void;
  onPalette: () => void;
};

const modes = [
  { value: 'explore', label: t('editor.explore') },
  { value: 'challenge', label: t('editor.challenge') },
] as const;

/** Editor.dc.html header (68 px): back, area + inline title, "Salvo há", Explorar/Desafio, ⌘K, "Desafiar este mapa". */
export const CanvasHeader = memo(function CanvasHeader(p: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const saved = useRef(p.board.title);
  const [title, setTitle] = useState(p.board.title);
  const now = useNow(30_000);

  async function save(input: string) {
    const next = boardTitleSchema.safeParse(input);
    if (!next.success || next.data === saved.current) return;
    setTitle(next.data); // optimistic
    const revert = (key: StringKey) => {
      setTitle(saved.current);
      toast({ title: t(key), tone: 'danger' });
    };
    try {
      const r = await api<Board>(`/v1/boards/${p.board.id}`, { method: 'PATCH', body: JSON.stringify({ title: next.data }) });
      if (!r.ok) return revert(`errors.${r.error.code}` as StringKey);
      saved.current = r.data.title;
      setTitle(r.data.title);
      router.refresh(); // rail + Meus mapas
    } catch {
      revert('errors.internal');
    }
  }

  const failed = p.status.state === 'error';
  return (
    <>
      <header className="flex h-[68px] shrink-0 items-center gap-3.5 border-b border-border bg-surface px-5">
        <Link
          href="/mapas"
          aria-label={t('editor.backToLibrary')}
          className="flex size-11 shrink-0 items-center justify-center rounded-[14px] border border-border text-ink no-underline hover:bg-primary-tint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <Icon name="left" size={20} aria-hidden="true" />
        </Link>
        {/* InlineTitle is 28 px in Torph; the mock header uses 23 px (design-system follow-up: a `size` prop). */}
        <div className="flex min-w-0 flex-col leading-[1.2] [&_button]:py-0 [&_h1]:text-[23px] [&_h1]:leading-[1.2] [&_h1]:tracking-[-.025em] [&_input]:text-[23px] [&_input]:leading-[1.2]">
          <span className="text-xs font-bold uppercase tracking-[.12em] text-muted">{t(`boards.area.${p.board.area}`)}</span>
          <InlineTitle value={title} inputLabel={t('map.titleLabel')} editHint={t('map.titleEdit')} maxLength={120} onSave={(v) => void save(v)} />
        </div>
        <span role="status" className="ml-1.5 flex shrink-0 items-center gap-[7px] text-[13px] text-muted">
          <span aria-hidden="true" className={`block size-2 rounded-full ${failed || p.status.state === 'offline' ? 'bg-review' : 'bg-primary'}`} />
          {saveText(p.status, p.board.updatedAt, now)}
        </span>
        <span className="grow" />
        <Segmented aria-label={t('map.toolbar.mode')} options={modes} value={p.mode} onValueChange={(v) => p.onMode(v as Mode)} />
        <span className="grow" />
        {/* Torph Button (rule 1): the mock's trigger is regular/muted text; ours is the secondary button weight. */}
        <Button size="sm" variant="secondary" icon={<Icon name="search" size={18} />} iconEnd={<Kbd>{t('palette.keyboardHint')}</Kbd>} onClick={p.onPalette} aria-keyshortcuts="Meta+K Control+K">
          {t('editor.commandPalette')}
        </Button>
        {p.mode === 'explore' ? (
          <Button size="sm" icon={<Icon name="bolt" size={18} />} onClick={() => p.onMode('challenge')}>
            {t('vocab.challengeBoard')}
          </Button>
        ) : (
          <Button size="sm" variant="secondary" icon={<Icon name="close" size={18} />} onClick={() => p.onMode('explore')}>
            {t('quiz.exit')}
          </Button>
        )}
      </header>
      {failed ? (
        <div className="absolute inset-x-0 top-[68px] z-20 px-5 pt-3">
          <Alert tone="review" role="alert" title={t('map.save.error')}>
            <Button variant="secondary" onClick={p.onRetry}>
              {t('common.retry')}
            </Button>
          </Alert>
        </div>
      ) : null}
    </>
  );
});
