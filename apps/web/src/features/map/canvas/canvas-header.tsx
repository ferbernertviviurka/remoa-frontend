'use client';

import { memo, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Board } from '@remoa/contracts';
import { boardTitleSchema } from '@remoa/contracts';
import { t, type StringKey } from '@remoa/strings';
import { Alert, Button, Eyebrow, Input, useToast } from '@remoa/ui';
import { api } from '@/lib/api';
import type { QueueStatus } from './op-queue';

function savedText(savedAt: number, now: number) {
  const min = Math.floor((now - savedAt) / 60_000);
  if (min < 1) return t('shell.header.savedNow');
  const tempo = min < 60 ? t('map.ago.minutes', { n: min }) : t('map.ago.hours', { n: Math.floor(min / 60) });
  return t('shell.header.savedAgo', { tempo });
}

function SaveIndicator({ status }: { status: QueueStatus }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(id);
  }, []);
  const text =
    status.state === 'offline'
      ? t('map.save.offline')
      : status.state === 'saving'
        ? t('map.save.saving')
        : status.state === 'saved' && status.savedAt
          ? savedText(status.savedAt, Math.max(now, status.savedAt))
          : '';
  return (
    <span role="status" className="text-sm text-muted">
      {text}
    </span>
  );
}

/** FR-12: area eyebrow, editable title, counts, save status (+ persistent save error with retry). */
export const CanvasHeader = memo(function CanvasHeader(p: { board: Board; cards: number; edges: number; status: QueueStatus; onRetry: () => void }) {
  const router = useRouter();
  const { toast } = useToast();
  const saved = useRef(p.board.title);
  const [title, setTitle] = useState(p.board.title);

  async function save() {
    const next = boardTitleSchema.safeParse(title);
    if (!next.success || next.data === saved.current) return setTitle(saved.current);
    try {
      const r = await api<Board>(`/v1/boards/${p.board.id}`, { method: 'PATCH', body: JSON.stringify({ title: next.data }) });
      if (!r.ok) {
        setTitle(saved.current);
        return toast({ title: t(`errors.${r.error.code}` as StringKey), tone: 'danger' });
      }
      saved.current = r.data.title;
      setTitle(r.data.title);
      router.refresh(); // sidebar + breadcrumb
    } catch {
      setTitle(saved.current);
      toast({ title: t('errors.internal'), tone: 'danger' });
    }
  }

  return (
    <header className="flex flex-col gap-2">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex w-full max-w-md flex-col gap-1">
          <Eyebrow>{t(`boards.area.${p.board.area}`)}</Eyebrow>
          <Input
            label={t('map.titleLabel')}
            value={title}
            maxLength={120}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => void save()}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur();
              if (e.key === 'Escape') {
                setTitle(saved.current);
                requestAnimationFrame(() => e.currentTarget?.blur());
              }
            }}
          />
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted">{t('map.stats', { cards: p.cards, edges: p.edges })}</span>
          <SaveIndicator status={p.status} />
          <Button variant="secondary" onClick={() => router.push(`/mapas/${p.board.id}/desafiar`)}>
            {t('vocab.challengeBoard')}
          </Button>
        </div>
      </div>
      {p.status.state === 'error' ? (
        <Alert tone="review" role="alert" title={t('map.save.error')}>
          <Button variant="secondary" onClick={p.onRetry}>
            {t('common.retry')}
          </Button>
        </Alert>
      ) : null}
    </header>
  );
});
