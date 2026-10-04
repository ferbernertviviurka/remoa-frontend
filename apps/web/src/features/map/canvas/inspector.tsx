'use client';

import { memo, useState, type ReactNode } from 'react';
import type { Board, Card, CardDetail, CardShape, MapState, RetrievabilityMap, SaveCardInput } from '@remoa/contracts';
import { t } from '@remoa/strings';
import {
  Button, CanvasPanel, Icon, IconButton, InspectorTabPanel, InspectorTabs, Menu, RubricList, StatePill, StepTimeline, type NodeStep,
} from '@remoa/ui';
import { CaseStageHelp } from '@/features/cards/case-stage-help';
import { CardEditor } from '@/features/cards/card-editor';
import { useCardFace } from '@/features/cards/card-face';
import { Markdown } from '@/features/cards/markdown';
import { useAsset, useAssets } from '@/features/cards/upload';
import { isDue } from './canvas-context';
import { track } from '@/lib/analytics';
import { api } from '@/lib/api';
import { primeCardDetail, useCardDetail } from './card-detail';
import { usePaywall } from '@/features/billing/paywall';
import { AiDraftTag } from '../ai-draft';
import { caseStageItems } from './card-node';

type Entry = RetrievabilityMap[string] | undefined;
export type Connection = { id: string; dir: 'out' | 'in'; title: string; label: string | null };

export type EditorHooks = {
  /** F02: the selected card is open in the editor inside the panel. */
  editing: boolean;
  onEdit: (cardId: string) => void;
  onClose: () => void;
  onSaved: (detail: CardDetail, input: SaveCardInput) => void;
  prepare: (cardId: string) => Promise<boolean>;
  /** G04: shape preview on the map node while the editor autosaves it. */
  onShape: (cardId: string, shape: CardShape) => void;
};

type Props = EditorHooks & {
  board: Board;
  /** Challenge mode: the F04 panel (features/challenge) replaces the map/card panel. */
  challengePanel: ReactNode | null;
  card: Card | null;
  entry: Entry;
  connections: Connection[];
  endOfToday: number;
  onDeselect: () => void;
  onDelete: (cardId: string) => void;
  onReviewCard: (cardId: string) => void;
  /** D-202: card menu "Restaurar tamanho padrão" (only while the card has a size of its own). */
  onResetSize: (cardId: string) => void;
};

const eyebrow = 'text-xs font-bold uppercase tracking-[.12em] text-muted';
const h2 = 'm-0 font-display text-[27px] font-extrabold leading-[1.1] tracking-[-.025em]';

/**
 * Editor.dc.html panel (340 px, floating): the selected card with tabs, F02 editor inside, or the challenge.
 * D-098: only rendered with a card selected (or in the challenge); the map summary moved out (header CTA, Meus mapas).
 */
export const Inspector = memo(function Inspector(p: Props) {
  const open = !!(p.challengePanel || p.card);
  // G06: the panel plays its closing animation after the deselect, so it keeps showing the card it had (CanvasPanel unmounts it)
  const shown = p.challengePanel ? null : p.card;
  const [kept, setKept] = useState(shown);
  if (open && shown !== kept) setKept(shown);
  const card = open ? shown : kept;
  return (
    <CanvasPanel aria-label={t('editor.panelLabel')} open={open}>
      {p.challengePanel ? p.challengePanel : card ? <CardPanel key={card.id} {...p} card={card} /> : null}
    </CanvasPanel>
  );
});

const bolt = <Icon name="bolt" size={18} />;
const dots = (
  <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
    <circle cx="3.5" cy="8" r="1.4" /><circle cx="8" cy="8" r="1.4" /><circle cx="12.5" cy="8" r="1.4" />
  </svg>
);

const tabs = (['content', 'rubric', 'origin', 'history'] as const).map((id) => ({ id, label: t(`inspector.tabs.${id}`) }));
type Tab = (typeof tabs)[number]['id'];
/** D-200: Conteúdo is never graded nor reviewed: no rubric, no history. */
const noteTabs = tabs.filter((x) => x.id === 'content' || x.id === 'origin');

function CardPanel(p: Props & { card: Card }) {
  const { card, entry } = p;
  const [tab, setTab] = useState<Tab>('content');
  const detail = useCardDetail(card.id, p.prepare);
  const state = entry?.state ?? 'unknown';
  const reviewed = !!entry && state !== 'unknown';
  const pill = reviewed ? t('canvas.footer.recall', { state: t(`mapState.${state}`), pct: Math.round(entry.r * 100) }) : t('canvas.footer.none');
  const note = card.type === 'note';
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
                ...(card.size ? [{ label: t('editor.resetSize'), onSelect: () => p.onResetSize(card.id) }] : []),
                { label: t('map.card.delete'), tone: 'danger' as const, onSelect: () => p.onDelete(card.id) },
              ]}
            />
            <IconButton variant="secondary" aria-label={t('editor.closePanelLabel')} onClick={p.onDeselect}>
              <Icon name="close" size={18} />
            </IconButton>
          </span>
        </div>
        <h2 className={h2}>{card.title}</h2>
        <AiDraftTag card={card} />
        {note ? null : <span className="flex"><StatePill state={state} label={pill} /></span>}
      </div>
      {p.editing ? (
        <div className="min-h-0 grow overflow-auto border-t border-border px-5 py-[18px]">
          <CardEditor card={card} subs={entry?.subs} prepare={p.prepare} onSaved={p.onSaved} onClose={p.onClose} onShape={p.onShape} />
        </div>
      ) : (
        <>
          <InspectorTabs aria-label={t('editor.sections')} idPrefix={`card-${card.id}`} tabs={note ? noteTabs : tabs} value={tab} onChange={setTab} />
          <div className="min-h-0 grow overflow-auto px-5 py-[18px]">
            <InspectorTabPanel idPrefix={`card-${card.id}`} id={tab}>
              {tab === 'content' ? <ContentTab card={card} detail={detail} entry={entry} connections={p.connections} endOfToday={p.endOfToday} /> : null}
              {tab === 'rubric' ? <RubricTab detail={detail} /> : null}
              {tab === 'origin' ? <OriginTab board={p.board} card={card} detail={detail} /> : null}
              {tab === 'history' ? <p className="m-0 text-sm leading-normal text-(--cv-ink-2)">{t('inspector.noHistory')}</p> : null}
            </InspectorTabPanel>
          </div>
          {note ? null : (
            <div className="border-t border-border px-5 pb-5 pt-3.5 [&>button]:w-full">
              <Button icon={bolt} onClick={() => p.onReviewCard(card.id)}>{t('inspector.reviewThis')}</Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

const img = 'mb-3 block w-full rounded-[14px]';

function Pic({ assetId, alt }: { assetId: string | null; alt: string }) {
  const a = useAsset(assetId);
  if (!assetId) return null;
  return a ? <img src={a.urls.w800} alt={alt} className={img} /> : <span className="mb-3 block h-28 rounded-[14px] bg-canvas" />;
}

/** The card's content in the panel: question image first, then the text/steps/stages, then the answer image (D-096, D-201). */
function Summary({ card, detail }: { card: Card; detail: CardDetail | null }) {
  const face = useCardFace(card);
  const ids = detail?.type === 'flow' ? (detail.payload.steps ?? []).map((s) => s.assetId) : detail?.type === 'case' ? (detail.payload.caseSteps ?? []).map((s) => s.assetId) : [];
  const assets = useAssets(ids);
  const src = (id: string) => assets.get(id)?.urls.w800 ?? null;
  const front = <Pic assetId={card.frontAssetId} alt={t('cards.frontImage.alt', { title: card.title })} />;
  const back = card.type === 'note' ? null : <Pic assetId={card.backAssetId} alt={t('cards.backImage.alt', { title: card.title })} />;
  const text = card.type === 'concept' ? (card.back ?? card.front) : card.type === 'note' ? card.front : null;
  if (text) return <>{front}<Markdown text={text} />{back}</>;
  if (detail?.type === 'flow' && detail.payload.steps?.length) {
    const steps: NodeStep[] = detail.payload.steps.map((s, i) => ({
      text: s.text,
      ...(s.assetId ? { image: { src: src(s.assetId), alt: t('canvas.stepImageAlt', { n: i + 1, title: card.title }) } } : {}),
    }));
    return <>{front}<StepTimeline steps={steps} />{back}</>;
  }
  if (card.type === 'case') {
    const stages = caseStageItems(card.preview?.stages, detail, (id, stage) => ({ src: src(id), alt: t('canvas.stageImageAlt', { stage, title: card.title }) }));
    return (
      <>
        {front}
        <ol className="m-0 flex list-none flex-col gap-3 p-0">
          {stages.map((st) => (
            <li key={st.key} className="flex flex-col gap-1">
              <CaseStageHelp stage={st.key} filled={!!st.filled} />
              <span className={st.filled ? 'text-sm' : 'text-sm text-muted'}>{st.text ?? (st.filled ? '' : t('cards.case.empty'))}</span>
              {st.image?.src ? <img src={st.image.src} alt={st.image.alt} className="block w-full rounded-[10px]" /> : null}
            </li>
          ))}
        </ol>
        {back}
      </>
    );
  }
  if (face.thumbnail?.src) return <>{front}<img src={face.thumbnail.src} alt={face.thumbnail.alt} className="w-full rounded-[14px]" /></>;
  return <>{front}{face.meta ?? t('inspector.noSummary')}{back}</>;
}

const stateBox: Record<MapState, { bg: string; fg: string; bar: string }> = {
  review: { bg: 'bg-review-bg', fg: 'text-review-text', bar: 'bg-review' },
  watch: { bg: 'bg-watch-bg', fg: 'text-watch-text', bar: 'bg-watch' },
  steady: { bg: 'bg-steady-bg', fg: 'text-steady-text', bar: 'bg-steady' },
  unknown: { bg: 'bg-unknown-bg', fg: 'text-unknown-text', bar: 'bg-unknown' },
};

function ContentTab({ card, detail, entry, connections, endOfToday }: { card: Card; detail: CardDetail | null; entry: Entry; connections: Connection[]; endOfToday: number }) {
  const state = entry?.state ?? 'unknown';
  const pct = Math.round((entry?.r ?? 0) * 100);
  const box = stateBox[state];
  return (
    <>
      <div className="text-[15px] leading-[1.55] text-(--cv-ink-2)">
        <Summary card={card} detail={detail} />
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

function RubricTab({ detail }: { detail: CardDetail | null }) {
  const paywall = usePaywall();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  if (!detail) return <p className="m-0 text-sm text-muted">{t('common.loading')}</p>;
  const r = detail.rubric;
  async function generate() {
    if (!detail) return;
    setFailed(false);
    setBusy(true);
    try {
      const created = await api<CardDetail['rubric']>('/v1/ai/rubric', { method: 'POST', body: JSON.stringify({ cardId: detail.id }) });
      if (!created.ok) {
        if (!paywall.handle(created.error)) setFailed(true);
        return;
      }
      track('rubric_generated', {});
      const fresh = await api<CardDetail>(`/v1/cards/${detail.id}`);
      if (fresh.ok) primeCardDetail(fresh.data);
      else setFailed(true);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }
  if (!r)
    return (
      <>
        <p className="m-0 text-sm leading-normal text-(--cv-ink-2)">{t('inspector.noRubricWarning')}</p>
        <Button variant="secondary" icon={<Icon name="sparkle" size={18} />} loading={busy} onClick={() => void generate()}>{t('cards.rubric.generate')}</Button>
        {failed ? <p role="alert" className="m-0 text-sm font-semibold text-review">{t('errors.internal')}</p> : null}
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

function changelogNote(mark: string | null, changelog: string | null | undefined) {
  if (!changelog) return null;
  if (mark && changelog.startsWith(`${mark}: `)) return changelog.slice(mark.length + 2);
  return changelog;
}

/** Source, temporal mark, and the reviewer stamped on the rubric when a card is approved. */
function OriginTab({ board, card, detail }: { board: Board; card: Card; detail: CardDetail | null }) {
  const approved = card.status === 'approved';
  const name = detail?.rubric?.reviewerName ?? null;
  const crm = detail?.rubric?.reviewerCrm ?? null;
  const reviewer = approved && name && crm
    ? t('inspector.reviewerInfo', { revisor: name, crm })
    : approved && name
      ? t('inspector.reviewerNamed', { revisor: name })
      : approved
        ? t('inspector.reviewerPending')
        : t('inspector.noEditorial');
  const copiedDate = board.copiedFrom?.at
    ? new Date(board.copiedFrom.at).toLocaleDateString('pt-BR')
    : null;
  const note = changelogNote(board.temporalMark, board.changelog);
  return (
    <dl className="m-0 flex flex-col">
      {copiedDate ? (
        <div className="mb-3 rounded-[12px] bg-canvas px-3 py-2.5 text-sm text-muted" data-testid="board-copied-from">
          {t('boardsOrigin.copiedFrom', { date: copiedDate })}
        </div>
      ) : null}
      <Row term={t('inspector.sourceLabel')}>{card.source ?? t('inspector.noSource')}</Row>
      <Row term={t('inspector.temporalLabel')}>{board.temporalMark ?? t('inspector.noMark')}</Row>
      {board.temporalMark ? <p className="m-0 py-2 text-sm text-muted">{t('inspector.changelog', { mark: board.temporalMark })}</p> : null}
      {note ? <p className="m-0 pb-2 text-sm text-(--cv-ink-2)">{note}</p> : null}
      <Row term={t('inspector.editorialLabel')}>{reviewer}</Row>
      <Row term={t('inspector.version')} last>
        {approved ? `v${board.version}` : t('inspector.status.draft')}
      </Row>
    </dl>
  );
}
