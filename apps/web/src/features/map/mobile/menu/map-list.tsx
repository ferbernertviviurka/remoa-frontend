'use client';

// F23 FR-17 (MapaMobileLista.dc.html): the map as a list by priority. Real list (ul/li, buttons), so it is also the accessible
// alternative to the canvas: every card reachable without dragging. Tapping a row hands the card to the map (focus + peek).
import { useMemo } from 'react';
import type { Card, MapState, RetrievabilityMap } from '@remoa/contracts';
import { t } from '@remoa/strings';
import { sortByPriority } from './priority';

const bar: Record<MapState, string> = { review: 'bg-review', watch: 'bg-watch', steady: 'bg-steady', unknown: 'bg-unknown-soft' };
const text: Record<MapState, string> = { review: 'text-review-text', watch: 'text-watch-text', steady: 'text-steady-text', unknown: 'text-unknown-text' };

const day = (d: Date) => d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });

function nextText(due: Date | null | undefined, endOfToday: number) {
  if (!due) return null;
  const ms = due.getTime();
  if (ms > endOfToday) return t('mapMobile.list.nextOn', { date: day(due) });
  return ms < endOfToday - 86_400_000 ? t('mapMobile.list.nextOverdue') : t('mapMobile.list.nextToday');
}

export function MobileMapList({ cards, heat, endOfToday, onOpen }: { cards: readonly Card[]; heat: RetrievabilityMap; endOfToday: number; onOpen: (id: string) => void }) {
  const rows = useMemo(() => sortByPriority(cards, heat), [cards, heat]);
  return (
    <section aria-label={t('mapMobile.list.ariaLabel')} className="absolute inset-0 overflow-y-auto px-3 pb-[calc(112px+env(safe-area-inset-bottom))] pt-[calc(80px+env(safe-area-inset-top))]">
      <h2 className="m-0 px-1 pb-3 text-sm font-bold text-ink-2">{t('mapMobile.list.heading', { n: rows.length })}</h2>
      {rows.length === 0 ? (
        <div className="rounded-[22px] border border-border bg-surface p-5">
          <p className="m-0 font-bold">{t('mapMobile.list.emptyTitle')}</p>
          <p className="m-0 text-sm text-muted">{t('mapMobile.list.emptyBody')}</p>
        </div>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
          {rows.map((c, i) => {
            const e = heat[c.id];
            const state: MapState = e?.state ?? 'unknown';
            const type = t(`mapMobile.card.typeLabel.${c.type}`);
            const stateLabel = t(`mapMobile.card.stateLabel.${state}`);
            const next = nextText(e?.due, endOfToday);
            const pct = e && state !== 'unknown' ? `${Math.round(e.r * 100)}%` : null;
            return (
              <li key={c.id} className="slide" style={{ animationDelay: `${Math.min(i, 12) * 50}ms` }}>
                <button
                  type="button"
                  aria-label={t('mapMobile.list.cardSelectLabel', { title: c.title, type, state: stateLabel, retrievability: pct ?? t('mapMobile.list.noRecall') }) + (next ? `, ${next}` : '')}
                  onClick={() => onOpen(c.id)}
                  className="relative flex min-h-[68px] w-full cursor-pointer items-center justify-between gap-3 overflow-hidden rounded-[22px] border border-border bg-surface py-3 pl-5 pr-4 text-left text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  <span aria-hidden="true" className={`absolute inset-y-3 left-0 w-1.5 rounded-r-md ${bar[state]}`} />
                  <span className="flex min-w-0 flex-col leading-[1.3]">
                    <span className="truncate font-display text-[17px] font-extrabold">{c.title}</span>
                    <span className="text-[13.5px] text-muted">{[type, stateLabel, next].filter(Boolean).join(' · ')}</span>
                  </span>
                  <span aria-hidden="true" className={`shrink-0 font-display text-xl font-extrabold ${text[state]}`}>{pct ?? '–'}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
