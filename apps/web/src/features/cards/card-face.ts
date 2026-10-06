// T6: what a map card shows per type, from `Card` + `preview` only (no payload fetch per node).
import { useMemo } from 'react';
import type { Card } from '@remoa/contracts';
import { withStrings } from '@remoa/strings';
import * as more from '@remoa/strings/ns';
import { stripMarkdown } from './markdown';
import { useAsset } from './upload';

const t = withStrings({ cards: more.cards });

export type CardFace = {
  /** Front (D-097): the question/hint; never the answer. */
  summary: string | null;
  /** Concept back as plain text (the node's back face, after "Ver resposta"). */
  answer: string | null;
  meta: string | null;
  chips: readonly string[] | undefined;
  thumbnail: { src: string | null; alt: string } | null;
};

const count = (n: number, one: 'cards.image.masksOne', many: 'cards.image.masks' | 'cards.flow.count') => (n === 1 ? t(one) : t(many, { n }));

export function cardFace(card: Card, thumbSrc: string | null): CardFace {
  const p = card.preview;
  switch (card.type) {
    case 'concept':
      return { summary: card.front ? stripMarkdown(card.front) : null, answer: card.back ? stripMarkdown(card.back) : null, meta: null, chips: undefined, thumbnail: null };
    case 'flow':
      return { summary: null, answer: null, meta: p?.steps ? t('cards.flow.count', { n: p.steps }) : null, chips: undefined, thumbnail: null };
    case 'case':
      return { summary: null, answer: null, meta: null, chips: p?.stages?.map((s) => t(`cards.case.stage.${s}`)), thumbnail: null };
    case 'note':
      return { summary: card.front ? stripMarkdown(card.front) : null, answer: null, meta: null, chips: undefined, thumbnail: null };
    case 'image':
      return {
        summary: null,
        answer: null,
        meta: p?.assetId ? count(p.masks ?? 0, 'cards.image.masksOne', 'cards.image.masks') : null,
        chips: undefined,
        thumbnail: { src: thumbSrc, alt: t('cards.image.alt', { title: card.title }) },
      };
  }
}

/** Memoized face; image thumbnails come from the shared per-asset cache (one request per asset). */
export function useCardFace(card: Card): CardFace {
  const asset = useAsset(card.type === 'image' ? card.preview?.assetId : null);
  const src = asset?.urls.w800 ?? null;
  return useMemo(() => cardFace(card, src), [card, src]);
}
