'use client';

import Link from 'next/link';
import type { QueueFilter, ReviewHub } from '@remoa/contracts';
import { withStrings } from '@remoa/strings';
import * as more from '@remoa/strings/ns';
import { Button, Icon } from '@remoa/ui';
import { track } from '@/lib/analytics';
import { sortAreas } from './hub-math';
import { SectionCard } from './section-card';

const t = withStrings({ boards: more.boards, review: more.review });
type StringKey = Parameters<typeof t>[0];

export type StartFn = (filter: QueueFilter) => void;
const areaName = (a: string) => t(`boards.area.${a as 'CM'}` as StringKey);

/** FR-13: accuracy by area, weakest first; < 70% review, 70-84% watch, >= 85% brand. */
export function Areas({ areas, onStart }: { areas: ReviewHub['areas']; onStart: StartFn }) {
  const rows = sortAreas(areas);
  const firstWith = rows.findIndex((a) => a.cards > 0);
  const withCards = rows.filter((a) => a.cards > 0).length;
  return (
    <SectionCard id="t-area" title={t('review.hub.focus.title')} sub={t('review.hub.focus.sub')}>
      <div>
        {rows.map((a, i) => {
          const has = a.cards > 0;
          const p = a.accuracy;
          const color = !has ? 'var(--border-strong)' : p == null ? 'var(--border-strong)' : p < 0.7 ? 'var(--state-review-border)' : p < 0.85 ? 'var(--state-watch-border)' : 'var(--primary)';
          const name = areaName(a.area);
          return (
            <div key={a.area} className="grid grid-cols-1 items-center gap-x-[18px] gap-y-2 border-t border-divider py-3 sm:grid-cols-[minmax(0,1fr)_150px]">
              <div className="flex min-w-0 flex-col gap-2">
                <span className="flex flex-wrap items-baseline justify-between gap-x-2.5">
                  <span className="font-bold">
                    {name}
                    {i === firstWith && withCards > 1 ? <span className="ml-2 rounded-pill bg-review-bg px-[9px] py-0.5 text-[11.5px] font-bold text-review-text">{t('review.hub.focus.weakest')}</span> : null}
                  </span>
                  <span className="whitespace-nowrap text-[13px] text-muted">{has ? t('review.hub.focus.meta', { cards: a.cards, due: a.dueToday }) : t('review.hub.focus.noCards')}</span>
                </span>
                <span aria-hidden="true" className="block h-3 overflow-hidden rounded-md bg-divider">
                  <span className="fillx block h-3 rounded-md" style={{ width: `${has && p != null ? Math.round(p * 100) : 0}%`, background: color, animationDelay: `${150 + i * 90}ms` }} />
                </span>
              </div>
              <div className="flex items-center justify-end gap-2.5">
                <span className={`font-display text-2xl font-extrabold tracking-[-.03em] tabular-nums ${has && p != null && p < 0.7 ? 'text-review-text' : has ? 'text-ink' : 'text-muted'}`}>{has && p != null ? `${Math.round(p * 100)}%` : '—'}</span>
                {has ? (
                  <Button size="sm" variant="secondary" aria-label={t('review.hub.focus.reviewArea', { area: name })} onClick={() => onStart({ area: a.area })}>
                    {t('review.hub.focus.review')}
                  </Button>
                ) : (
                  <Link href="/app/mapas/novo" className="flex h-11 items-center justify-center px-1.5 text-[13.5px] font-bold text-primary-deep">{t('review.hub.focus.createMap')}</Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}

/** FR-14: at most 4 on the screen. */
export function HardCards({ cards }: { cards: ReviewHub['hardCards'] }) {
  return (
    <SectionCard id="t-hard" title={t('review.hub.hard.title')} sub={t('review.hub.hard.sub')}>
      {cards.length === 0 ? (
        <p className="m-0 text-sm text-muted">{t('review.hub.hard.empty')}</p>
      ) : (
        <div>
          {cards.slice(0, 4).map((c, i) => (
            <div key={c.cardId} className="slide flex items-center gap-3.5 border-t border-divider py-3" style={{ animationDelay: `${i * 80}ms` }}>
              <span className="flex size-[52px] shrink-0 flex-col items-center justify-center rounded-2xl bg-review-bg font-display text-lg font-extrabold leading-none text-review-text">
                {Math.round(c.r * 100)}%
                <span className="font-sans text-[10.5px] font-bold">{t('review.hub.hard.recall')}</span>
              </span>
              <span className="flex min-w-0 grow flex-col leading-[1.3]">
                <span className="font-bold">{c.title}</span>
                <span className="text-[13px] text-muted">{t('review.hub.hard.meta', { map: c.boardTitle, lapses: c.lapses })}</span>
              </span>
              <Link href={`/app/mapas/${c.boardId}?card=${c.cardId}`} onClick={() => track('revisar_hard_card_opened', {})} aria-label={t('review.hub.hard.rewrite', { title: c.title })} className="flex size-11 shrink-0 items-center justify-center rounded-xl border-[1.5px] border-border-strong text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
                <Icon name="pencil" size={18} />
              </Link>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

const COLS = 'lg:grid-cols-[minmax(0,2fr)_minmax(0,2.4fr)_110px_110px_150px]';
const BAR = ['var(--state-review-border)', 'var(--state-watch-border)', 'var(--primary)', 'var(--state-unknown-soft)'] as const;

/** FR-15: table by map. */
export function PerMap({ maps, onStart }: { maps: ReviewHub['maps']; onStart: StartFn }) {
  return (
    <SectionCard id="t-pm" title={t('review.hub.perMap.title')} tight>
      <div role="table" aria-label={t('review.hub.perMap.title')}>
        <div role="row" className={`hidden gap-[18px] py-2.5 text-xs font-bold uppercase tracking-[.1em] text-muted lg:grid ${COLS}`}>
          <span role="columnheader">{t('review.hub.perMap.map')}</span>
          <span role="columnheader">{t('review.hub.perMap.states')}</span>
          <span role="columnheader">{t('review.hub.perMap.due')}</span>
          <span role="columnheader">{t('review.hub.perMap.retention')}</span>
          <span role="columnheader"><span className="sr-only">{t('review.hub.perMap.review')}</span></span>
        </div>
        {maps.map((m, i) => {
          const s = m.states;
          return (
            <div key={m.boardId} role="row" className={`slide grid min-h-[72px] grid-cols-1 items-center gap-x-[18px] gap-y-2 border-t border-divider py-3 lg:py-0 ${COLS}`} style={{ animationDelay: `${i * 70}ms` }}>
              <span role="cell" className="flex min-w-0 flex-col leading-[1.3]">
                <span className="font-bold">{m.title}</span>
                <span className="text-[13px] text-muted">{t('review.hub.perMap.meta', { area: areaName(m.area), cards: m.cards })}</span>
              </span>
              <span role="cell">
                <span role="img" aria-label={t('review.hub.perMap.barLabel', { review: s.review, watch: s.watch, steady: s.steady, unknown: s.unknown })} className="flex h-3.5 overflow-hidden rounded-[7px] bg-divider">
                  {[s.review, s.watch, s.steady, s.unknown].map((n, j) => (
                    <span key={j} style={{ flexGrow: n, flexBasis: 0, background: BAR[j] }} />
                  ))}
                </span>
              </span>
              <span role="cell">
                <span className={`inline-block rounded-pill px-3 py-[3px] text-[13px] font-bold ${m.due > 0 ? 'bg-review-bg text-review-text' : 'bg-primary-tint text-primary-deep'}`}>{t('review.hub.perMap.dueNow', { n: m.due })}</span>
              </span>
              <span role="cell" className="font-bold tabular-nums">{m.retention30 == null ? t('review.hub.perMap.noRetention') : `${Math.round(m.retention30 * 100)}%`}</span>
              <span role="cell">
                <Button size="sm" variant="secondary" aria-label={t('review.hub.perMap.reviewMap', { title: m.title })} onClick={() => onStart({ boardIds: [m.boardId], reasons: ['due', 'new'] })}>
                  {t('review.hub.perMap.review')}
                </Button>
              </span>
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}

export function NoData({ empty }: { empty: boolean }) {
  return (
    <section className="flex flex-col items-center gap-3.5 rounded-[34px] border border-border bg-surface px-6 py-14 text-center">
      <span aria-hidden="true" className="flex size-[72px] items-center justify-center rounded-3xl bg-primary-tint text-primary-deep">
        <Icon name="maps" size={34} />
      </span>
      <h2 className="m-0 max-w-[560px] font-display text-[28px] font-extrabold leading-[1.1] tracking-[-.03em]">{t('review.hub.noData.title')}</h2>
      <p className="m-0 max-w-[520px] text-muted">{t('review.hub.noData.body')}</p>
      {empty ? (
        <Link href="/app/mapas/novo" className="lift inline-flex min-h-[52px] items-center gap-2 rounded-field bg-primary px-[26px] font-bold text-on-primary no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
          <Icon name="plus" size={20} />
          {t('review.hub.noData.cta')}
        </Link>
      ) : null}
    </section>
  );
}
