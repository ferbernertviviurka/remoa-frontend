'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import type { QueueItem } from '@remoa/contracts';
import { t } from '@remoa/strings';
import { Button, Card, Stat } from '@remoa/ui';
import { track } from '@/lib/analytics';
import { EmptyState } from '@/features/shell/empty-state';

const count = (items: QueueItem[], reason: QueueItem['reason']) => items.filter((i) => i.reason === reason).length;

export function QueueView({ items, boardTitles }: { items: QueueItem[]; boardTitles: Record<string, string> }) {
  const router = useRouter();
  const due = count(items, 'due');
  const fresh = count(items, 'new');
  const weak = count(items, 'weak');

  useEffect(() => {
    track('queue_opened', { due, new: fresh, weak });
  }, [due, fresh, weak]);

  if (items.length === 0) {
    return (
      <EmptyState title={t('review.empty.title')} body={t('review.empty.body')}>
        <Link href="/mapas">{t('review.empty.cta')}</Link>
      </EmptyState>
    );
  }

  const groups = new Map<string, QueueItem[]>();
  for (const i of items) groups.set(i.boardId, [...(groups.get(i.boardId) ?? []), i]);
  const dueByBoard = [...groups].map(([id, g]) => [id, count(g, 'due')] as const).sort((a, b) => b[1] - a[1]);
  const top = dueByBoard[0];

  const head = due === 0 ? t('review.headlineNone') : due === 1 ? t('review.headlineOne') : t('review.headlineMany', { due });
  const headline = due > 0 && top ? t('review.headlineIn', { head, n: top[1], board: boardTitles[top[0]] ?? t('review.unknownBoard') }) : head;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-extrabold text-text">{headline}</h1>
      <div className="grid grid-cols-3 gap-3">
        <Stat label={t('review.due')} value={String(due)} />
        <Stat label={t('review.new')} value={String(fresh)} />
        <Stat label={t('review.weak')} value={String(weak)} />
      </div>
      <ul aria-label={t('review.groupsLabel')} className="flex flex-col gap-3">
        {[...groups].map(([id, g]) => (
          <li key={id}>
            <Card>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Link href={`/mapas/${id}`} className="font-semibold text-text underline">
                  {boardTitles[id] ?? t('review.unknownBoard')}
                </Link>
                <span className="text-sm text-muted">
                  {count(g, 'due')} {t('review.due')} · {count(g, 'new')} {t('review.new')} · {count(g, 'weak')} {t('review.weak')}
                </span>
              </div>
            </Card>
          </li>
        ))}
      </ul>
      <div>
        <Button onClick={() => router.push('/revisar/sessao')}>
          {t('review.start')}
        </Button>
      </div>
    </div>
  );
}
