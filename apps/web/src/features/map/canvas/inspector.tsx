'use client';

import { memo, type ReactNode } from 'react';
import type { Board, Card, CardDetail, RetrievabilityMap, SaveCardInput } from '@remoa/contracts';
import { t } from '@remoa/strings';
import { Button, Empty, Eyebrow, Progress, Tag } from '@remoa/ui';
import { CardEditor } from '@/features/cards/card-editor';
import { useCardFace } from '@/features/cards/card-face';
import { Markdown } from '@/features/cards/markdown';

type Entry = RetrievabilityMap[string] | undefined;

function Row({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs font-semibold text-muted">{term}</dt>
      <dd className="text-sm text-text">{children}</dd>
    </div>
  );
}

export type EditorHooks = {
  /** F02: the selected card is open in the inline editor. */
  editing: boolean;
  onEdit: (cardId: string) => void;
  onClose: () => void;
  onSaved: (detail: CardDetail, input: SaveCardInput) => void;
  prepare: (cardId: string) => Promise<boolean>;
};

/** FR-8: details of the single selected card; F02: hosts its editor. */
export const Inspector = memo(function Inspector({ board, card, entry, ...editor }: { board: Board; card: Card | null; entry: Entry } & EditorHooks) {
  return (
    <aside aria-label={t('map.inspector.label')} className="hidden w-80 shrink-0 flex-col gap-5 overflow-y-auto rounded-map border border-border bg-surface p-4 md:flex">
      {!card ? (
        <Empty title={t('map.inspector.empty')} />
      ) : (
        <Details
          board={board}
          card={card}
          entry={entry}
          onEdit={editor.onEdit}
          editor={
            editor.editing ? (
              <CardEditor key={card.id} card={card} subs={entry?.subs} prepare={editor.prepare} onSaved={editor.onSaved} onClose={editor.onClose} />
            ) : null
          }
        />
      )}
    </aside>
  );
});

function Summary({ card }: { card: Card }) {
  const face = useCardFace(card);
  const text = card.type === 'concept' ? (card.back ?? card.front) : null;
  if (text) return <Markdown text={text} />;
  if (face.thumbnail?.src) return <img src={face.thumbnail.src} alt={face.thumbnail.alt} className="w-full rounded-tag" />;
  if (face.chips?.length) return <span className="flex flex-wrap gap-1">{face.chips.map((c) => <Tag key={c} tone="unknown">{c}</Tag>)}</span>;
  return <>{face.meta ?? t('map.inspector.noSummary')}</>;
}

type DetailsProps = { board: Board; card: Card; entry: Entry; onEdit: (id: string) => void; editor: ReactNode };

function Details({ board, card, entry, onEdit, editor }: DetailsProps) {
  const state = entry?.state ?? 'unknown';
  const reviewed = entry && state !== 'unknown';
  const pct = Math.round((entry?.r ?? 0) * 100);
  return (
    <>
      <div className="flex flex-col gap-1">
        <Eyebrow>{t(`map.cardType.${card.type}`)}</Eyebrow>
        <h2 className="font-display text-lg font-bold leading-snug">{card.title}</h2>
      </div>
      {editor ?? <Button onClick={() => onEdit(card.id)}>{t('cards.edit')}</Button>}
      <dl className="flex flex-col gap-3">
        {editor ? null : (
          <Row term={t('map.inspector.summary')}>
            <Summary card={card} />
          </Row>
        )}
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
