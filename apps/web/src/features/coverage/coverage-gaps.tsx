'use client';

import Link from 'next/link';
import type { BoardSummary, MatrixItem } from '@remoa/contracts';
import { t } from '@remoa/strings';
import { Button, Dialog } from '@remoa/ui';
import { linkableBoards } from './coverage-logic';

export const linkCls = 'inline-flex min-h-11 items-center rounded-[14px] px-4 text-[15px] font-bold text-primary-deep no-underline hover:bg-primary-tint';

/** One topic with its two actions: create a map for it, or link a map the student already has. */
export function TopicActions({ topic, onLink }: { topic: MatrixItem; onLink: (t: MatrixItem) => void }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-track py-2">
      <span className="flex flex-col">
        <span className="font-semibold">{topic.title}</span>
        <span className="text-sm text-muted">{t('coverage.target', { n: topic.targetCards })}</span>
      </span>
      <span className="flex flex-wrap gap-1">
        <Link href={`/mapas/novo?item=${topic.id}`} aria-label={t('coverage.createMapFor', { topic: topic.title })} className={linkCls}>{t('coverage.createMap')}</Link>
        <Button size="sm" variant="quiet" aria-label={t('coverage.linkExistingFor', { topic: topic.title })} onClick={() => onLink(topic)}>{t('coverage.linkExisting')}</Button>
      </span>
    </li>
  );
}

export function LinkDialog({ topic, boards, busy, onPick, onClose }: { topic: MatrixItem | null; boards: BoardSummary[]; busy: boolean; onPick: (b: BoardSummary) => void; onClose: () => void }) {
  const options = linkableBoards(boards);
  return (
    <Dialog open={topic !== null} onOpenChange={(o) => o || onClose()} title={t('coverage.linkTitle', { topic: topic?.title ?? '' })} description={t('coverage.linkBody')} closeLabel={t('common.close')}>
      {options.length === 0 ? (
        <p className="m-0 text-muted">{t('coverage.linkNone')}</p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {options.map((b) => (
            <li key={b.id}>
              <Button variant="secondary" disabled={busy} aria-label={t('coverage.linkPick', { map: b.title })} onClick={() => onPick(b)}>
                {b.title} · {t('coverage.linkCards', { n: b.cardCount })}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Dialog>
  );
}
