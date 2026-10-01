'use client';

import { memo, type ReactNode } from 'react';
import type { Board, Card, RetrievabilityMap } from '@remoa/contracts';
import { t } from '@remoa/strings';
import { Button, Eyebrow, Progress, Tag } from '@remoa/ui';

type Entry = RetrievabilityMap[string] | undefined;

function Row({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs font-semibold text-muted">{term}</dt>
      <dd className="text-sm text-text">{children}</dd>
    </div>
  );
}

/** FR-8: details of the single selected card. */
export const Inspector = memo(function Inspector({ board, card, entry }: { board: Board; card: Card | null; entry: Entry }) {
  return (
    <aside aria-label={t('map.inspector.label')} className="hidden w-80 shrink-0 flex-col gap-5 overflow-y-auto rounded-map border border-border bg-surface p-4 md:flex">
      {card ? <Details board={board} card={card} entry={entry} /> : <p className="text-sm text-muted">{t('map.inspector.empty')}</p>}
    </aside>
  );
});

function Details({ board, card, entry }: { board: Board; card: Card; entry: Entry }) {
  const state = entry?.state ?? 'unknown';
  const reviewed = entry && state !== 'unknown';
  const pct = Math.round((entry?.r ?? 0) * 100);
  return (
    <>
      <div className="flex flex-col gap-1">
        <Eyebrow>{t(`map.cardType.${card.type}`)}</Eyebrow>
        <h2 className="font-display text-lg font-bold leading-snug">{card.title}</h2>
      </div>
      <dl className="flex flex-col gap-3">
        <Row term={t('map.inspector.summary')}>{card.back ?? card.front ?? t('map.inspector.noSummary')}</Row>
        <Row term={t('vocab.retrievability')}>
          <span className="flex flex-col gap-2">
            <span className="flex items-center justify-between gap-2">
              <Tag tone={state}>{t(`mapState.${state}`)}</Tag>
              {reviewed ? <span className="font-display font-bold">{`${pct}%`}</span> : null}
            </span>
            <Progress aria-label={t('vocab.retrievability')} value={reviewed ? pct : 0} />
            <span className="text-xs text-muted">
              {entry?.due ? t('map.inspector.nextReview', { data: new Date(entry.due).toLocaleDateString('pt-BR') }) : reviewed ? null : t('map.inspector.noReview')}
            </span>
          </span>
        </Row>
      </dl>
      <section className="flex flex-col gap-3">
        <h3 className="text-xs font-bold uppercase tracking-[.13em] text-muted">{t('map.inspector.provenance')}</h3>
        <dl className="flex flex-col gap-3">
          <Row term={t('map.inspector.source')}>{card.source ?? t('map.inspector.none')}</Row>
          <Row term={t('map.inspector.temporalMark')}>{board.temporalMark ?? t('map.inspector.none')}</Row>
          <Row term={t('map.inspector.reviewer')}>
            <Tag tone={card.status === 'approved' ? 'steady' : 'watch'}>
              {t(card.status === 'approved' ? 'map.inspector.status.approved' : 'map.inspector.status.draft')}
            </Tag>
          </Row>
        </dl>
      </section>
      <div className="mt-auto flex flex-col gap-2">
        {/* F04 (revisar este conceito) and F10 (fonte e versão) wire these up. */}
        <Button variant="secondary" disabled>{t('map.inspector.reviewThis')}</Button>
        <Button variant="quiet" disabled>{t('map.inspector.viewSource')}</Button>
      </div>
    </>
  );
}
