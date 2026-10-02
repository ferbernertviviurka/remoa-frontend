'use client';

import { memo, useState, type ReactNode } from 'react';
import type { Board, Card, CardDetail, MapState, RetrievabilityMap, SaveCardInput } from '@remoa/contracts';
import { t } from '@remoa/strings';
import {
  Button, CanvasPanel, Icon, IconButton, InspectorTabPanel, InspectorTabs, mapStateOrder, Menu, Ring, RubricList, StatePill, Tag,
} from '@remoa/ui';
import { CardEditor } from '@/features/cards/card-editor';
import { useCardFace } from '@/features/cards/card-face';
import { Markdown } from '@/features/cards/markdown';
import { isDue } from './canvas-context';
import { useCardDetail } from './card-detail';

type Entry = RetrievabilityMap[string] | undefined;
export type Connection = { id: string; dir: 'out' | 'in'; title: string; label: string | null };
export type MapSummary = { cards: number; edges: number; counts: Record<MapState, number>; due: number };
export type Coverage = { pct: number; item: string } | null;

export type EditorHooks = {
  /** F02: the selected card is open in the editor inside the panel. */
  editing: boolean;
  onEdit: (cardId: string) => void;
  onClose: () => void;
  onSaved: (detail: CardDetail, input: SaveCardInput) => void;
  prepare: (cardId: string) => Promise<boolean>;
};

type Props = EditorHooks & {
  board: Board;
  /** Challenge mode: the F04 panel (features/challenge) replaces the map/card panel. */
  challengePanel: ReactNode | null;
  summary: MapSummary;
  coverage: Coverage;
  card: Card | null;
  entry: Entry;
  connections: Connection[];
  endOfToday: number;
  onDeselect: () => void;
  onDelete: (cardId: string) => void;
  /** Enter the challenge mode (`?modo=desafio`). */
  onChallenge: () => void;
  onReviewCard: (cardId: string) => void;
};

const eyebrow = 'text-xs font-bold uppercase tracking-[.12em] text-muted';
const h2 = 'm-0 font-display text-[27px] font-extrabold leading-[1.1] tracking-[-.025em]';
const stateDot: Record<MapState, string> = { review: 'bg-review', watch: 'bg-watch', steady: 'bg-steady', unknown: 'bg-unknown' };

/** Editor.dc.html panel (340 px, floating): map summary, or the selected card with tabs; F02 editor inside. */
export const Inspector = memo(function Inspector(p: Props) {
  return (
    <CanvasPanel aria-label={t('editor.panelLabel')}>
      {p.challengePanel ? (
        p.challengePanel
      ) : p.card ? (
        <CardPanel key={p.card.id} {...p} card={p.card} />
      ) : (
        <MapPanel board={p.board} summary={p.summary} coverage={p.coverage} onChallenge={p.onChallenge} />
      )}
    </CanvasPanel>
  );
});

const challengeLabel = (due: number) => (due > 0 ? t('quiz.challengeBoard', { n: due }) : t('vocab.challengeBoard'));
const bolt = <Icon name="bolt" size={18} />;
const dots = (
  <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
    <circle cx="3.5" cy="8" r="1.4" /><circle cx="8" cy="8" r="1.4" /><circle cx="12.5" cy="8" r="1.4" />
  </svg>
);

function MapPanel({ board, summary, coverage, onChallenge }: Pick<Props, 'board' | 'summary' | 'coverage' | 'onChallenge'>) {
  return (
    <div className="box-border flex h-full flex-col gap-[18px] overflow-auto px-[22px] pb-5 pt-[22px]">
      <div className="flex flex-col gap-1.5">
        <span className={eyebrow}>{t('editor.mapInfo')}</span>
        <h2 className={h2}>{board.title}</h2>
      </div>
      <div className="flex items-center gap-4 rounded-[22px] bg-canvas p-4">
        {coverage ? (
          <>
            <span className="relative shrink-0">
              <Ring value={coverage.pct} max={100} size={84} tone="primary" label={t('inspector.coverage', { pct: coverage.pct })} />
              <span aria-hidden="true" className="absolute inset-0 flex items-center justify-center font-display text-[19px] font-extrabold">
                {t('map.zoom.percent', { n: coverage.pct })}
              </span>
            </span>
            <span className="flex flex-col leading-[1.4]">
              <span className="font-bold">{t('editor.enamed')}</span>
              <span className="text-[13px] text-muted">{t('editor.coverageItem', { item: coverage.item })}</span>
            </span>
          </>
        ) : (
          <span className="flex flex-col leading-[1.4]">
            <span className="font-bold">{t('editor.enamed')}</span>
            <span className="text-[13px] text-muted">{t('editor.noMatrixItem')}</span>
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        <Stat n={summary.cards} label={t('editor.statCards', { n: summary.cards })} />
        <Stat n={summary.edges} label={t('editor.statEdges', { n: summary.edges })} />
      </div>
      <div className="flex flex-col gap-2.5">
        <span className={eyebrow}>{t('canvas.layersLabel')}</span>
        <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
          {mapStateOrder.map((s) => (
            <li key={s} className="flex items-center gap-2.5">
              <span aria-hidden="true" className={`block size-2.5 rounded-full ${stateDot[s]}`} />
              <span className="w-[104px] text-sm font-semibold">{t(`mapState.${s}`)}</span>
              <span aria-hidden="true" className="block h-2 grow overflow-hidden rounded bg-(--cv-line-soft)">
                <span className={`block h-2 ${stateDot[s]}`} style={{ width: `${summary.cards ? (summary.counts[s] * 100) / summary.cards : 0}%` }} />
              </span>
              <span className="w-[18px] text-right font-bold tabular-nums">{summary.counts[s]}</span>
            </li>
          ))}
        </ul>
      </div>
      <span className="grow" />
      <p className="m-0 text-[13px] leading-normal text-muted">{t('editor.emptyPanel')}</p>
      <Button icon={bolt} onClick={onChallenge}>{challengeLabel(summary.due)}</Button>
    </div>
  );
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <div className="rounded-2xl border border-border px-3.5 py-3">
      <span className="block font-display text-[26px] font-extrabold leading-[1.1] tabular-nums">{n}</span>
      <span className="text-[13px] text-muted">{label}</span>
    </div>
  );
}

const tabs = (['content', 'rubric', 'origin', 'history'] as const).map((id) => ({ id, label: t(`inspector.tabs.${id}`) }));
type Tab = (typeof tabs)[number]['id'];

function CardPanel(p: Props & { card: Card }) {
  const { card, entry } = p;
  const [tab, setTab] = useState<Tab>('content');
  const detail = useCardDetail(card.id, p.prepare);
  const state = entry?.state ?? 'unknown';
  const reviewed = !!entry && state !== 'unknown';
  const pill = reviewed ? t('canvas.footer.recall', { state: t(`mapState.${state}`), pct: Math.round(entry.r * 100) }) : t('canvas.footer.none');
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-col gap-2.5 px-5 pb-3.5 pt-5">
        <div className="flex items-center justify-between gap-2">
          <span className={eyebrow}>{t(`canvas.nodeType.${card.type}`)}</span>
          <span className="flex items-center gap-1">
            <Menu
              trigger="icon"
              align="end"
              icon={dots}
              label={t('editor.cardMenu', { title: card.title })}
              items={[
                { label: t('cards.edit'), onSelect: () => p.onEdit(card.id) },
                { label: t('map.card.delete'), tone: 'danger', onSelect: () => p.onDelete(card.id) },
              ]}
            />
            <IconButton variant="secondary" aria-label={t('editor.closePanelLabel')} onClick={p.onDeselect}>
              <Icon name="close" size={18} />
            </IconButton>
          </span>
        </div>
        <h2 className={h2}>{card.title}</h2>
        <span className="flex"><StatePill state={state} label={pill} /></span>
      </div>
      {p.editing ? (
        <div className="min-h-0 grow overflow-auto border-t border-border px-5 py-[18px]">
          <CardEditor card={card} subs={entry?.subs} prepare={p.prepare} onSaved={p.onSaved} onClose={p.onClose} />
        </div>
      ) : (
        <>
          <InspectorTabs aria-label={t('editor.sections')} idPrefix={`card-${card.id}`} tabs={tabs} value={tab} onChange={setTab} />
          <div className="min-h-0 grow overflow-auto px-5 py-[18px]">
            <InspectorTabPanel idPrefix={`card-${card.id}`} id={tab}>
              {tab === 'content' ? <ContentTab card={card} entry={entry} connections={p.connections} endOfToday={p.endOfToday} /> : null}
              {tab === 'rubric' ? <RubricTab detail={detail} onEdit={() => p.onEdit(card.id)} /> : null}
              {tab === 'origin' ? <OriginTab board={p.board} card={card} /> : null}
              {tab === 'history' ? <p className="m-0 text-sm leading-normal text-(--cv-ink-2)">{t('inspector.noHistory')}</p> : null}
            </InspectorTabPanel>
          </div>
          <div className="border-t border-border px-5 pb-5 pt-3.5 [&>button]:w-full">
            <Button icon={bolt} onClick={() => p.onReviewCard(card.id)}>{t('inspector.reviewThis')}</Button>
          </div>
        </>
      )}
    </div>
  );
}

function Summary({ card }: { card: Card }) {
  const face = useCardFace(card);
  const text = card.type === 'concept' ? (card.back ?? card.front) : null;
  if (text) return <Markdown text={text} />;
  if (face.thumbnail?.src) return <img src={face.thumbnail.src} alt={face.thumbnail.alt} className="w-full rounded-[14px]" />;
  if (face.chips?.length) return <span className="flex flex-wrap gap-1">{face.chips.map((c) => <Tag key={c} tone="unknown">{c}</Tag>)}</span>;
  return <>{face.meta ?? t('inspector.noSummary')}</>;
}

const stateBox: Record<MapState, { bg: string; fg: string; bar: string }> = {
  review: { bg: 'bg-review-bg', fg: 'text-review-text', bar: 'bg-review' },
  watch: { bg: 'bg-watch-bg', fg: 'text-watch-text', bar: 'bg-watch' },
  steady: { bg: 'bg-steady-bg', fg: 'text-steady-text', bar: 'bg-steady' },
  unknown: { bg: 'bg-unknown-bg', fg: 'text-unknown-text', bar: 'bg-unknown' },
};

function ContentTab({ card, entry, connections, endOfToday }: { card: Card; entry: Entry; connections: Connection[]; endOfToday: number }) {
  const state = entry?.state ?? 'unknown';
  const pct = Math.round((entry?.r ?? 0) * 100);
  const box = stateBox[state];
  return (
    <>
      <div className="text-[15px] leading-[1.55] text-(--cv-ink-2)">
        <Summary card={card} />
      </div>
      {entry && state !== 'unknown' ? (
        <div className={`flex flex-col gap-2 rounded-[20px] p-4 ${box.bg} ${box.fg}`}>
          <span className="text-xs font-bold uppercase tracking-[.1em]">{t('vocab.retrievability')}</span>
          <span className="flex items-baseline gap-2.5">
            <span className="font-display text-[40px] font-extrabold leading-none">{t('map.zoom.percent', { n: pct })}</span>
            {entry.due ? (
              <span className="text-[13px]">
                {isDue(entry.due, endOfToday) ? t('inspector.nextToday') : t('inspector.nextOn', { data: new Date(entry.due).toLocaleDateString('pt-BR') })}
              </span>
            ) : null}
          </span>
          <span aria-hidden="true" className="block h-2 overflow-hidden rounded bg-white/70">
            <span className={`block h-2 ${box.bar}`} style={{ width: `${pct}%` }} />
          </span>
        </div>
      ) : null}
      <div className="flex flex-col gap-1.5">
        <h3 className={`m-0 ${eyebrow}`}>{t('inspector.connections', { n: connections.length })}</h3>
        {connections.length ? (
          <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
            {connections.map((c) => (
              <li key={c.id} className="flex items-center gap-2.5 rounded-[14px] bg-canvas px-3 py-2.5 text-sm">
                <Icon name={c.dir === 'out' ? 'right' : 'left'} size={16} aria-hidden="true" className="shrink-0 text-muted" />
                <span className="sr-only">{t(c.dir === 'out' ? 'inspector.outgoing' : 'inspector.incoming')}</span>
                <span>
                  <span className="font-bold">{c.title}</span> <span className="text-muted">· {c.label ?? t('inspector.unlabelled')}</span>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="m-0 text-sm text-muted">{t('inspector.noConnections')}</p>
        )}
      </div>
    </>
  );
}

function RubricTab({ detail, onEdit }: { detail: CardDetail | null; onEdit: () => void }) {
  if (!detail) return <p className="m-0 text-sm text-muted">{t('common.loading')}</p>;
  const r = detail.rubric;
  if (!r)
    return (
      <>
        <p className="m-0 text-sm leading-normal text-(--cv-ink-2)">{t('inspector.noRubricWarning')}</p>
        {/* F05 generates rubrics; until then the card editor is where a rubric would be written. */}
        <Button variant="secondary" icon={<Icon name="sparkle" size={18} />} onClick={onEdit}>{t('cards.rubric.generate')}</Button>
      </>
    );
  const approved = r.status === 'approved';
  return (
    <RubricList
      header={{ badge: t(`inspector.status.${r.status}`), meta: t(approved ? 'inspector.rubricApproved' : 'inspector.rubricDraft', { v: r.version }) }}
      essentialLabel={t('inspector.essentialLabel')}
      optionalLabel={t('inspector.optionalLabel')}
      items={r.points}
    />
  );
}

function Row({ term, children, last }: { term: string; children: ReactNode; last?: boolean }) {
  return (
    <div className={`flex justify-between gap-3 py-3 ${last ? '' : 'border-b border-(--cv-line-soft)'}`}>
      <dt className="text-muted">{term}</dt>
      <dd className="m-0 text-right font-semibold">{children}</dd>
    </div>
  );
}

/** Rule 6: source, temporal mark, reviewer (name + CRM). No reviewer profile endpoint yet: honest placeholder. */
function OriginTab({ board, card }: { board: Board; card: Card }) {
  const approved = card.status === 'approved';
  return (
    <dl className="m-0 flex flex-col">
      <Row term={t('inspector.sourceLabel')}>{card.source ?? t('inspector.noSource')}</Row>
      <Row term={t('inspector.temporalLabel')}>{board.temporalMark ?? t('inspector.noMark')}</Row>
      <Row term={t('inspector.editorialLabel')}>{approved ? t('inspector.reviewerPending') : t('inspector.noEditorial')}</Row>
      <Row term={t('inspector.version')} last>
        {approved ? `v${board.version}` : t('inspector.status.draft')}
      </Row>
    </dl>
  );
}
