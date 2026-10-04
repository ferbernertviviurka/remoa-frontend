'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { BoardGraph, MapState, RetrievabilityMap } from '@remoa/contracts';
import { t } from '@remoa/strings';
import { Button, FilterChip, Input } from '@remoa/ui';
import { api } from '@/lib/api';

const states = ['all', 'review', 'watch', 'steady', 'unknown'] as const;
type Filter = (typeof states)[number];

export function filterMobileCards<T extends { id: string; title: string }>(cards: T[], query: string, state: Filter, heat: RetrievabilityMap): T[] {
  const q = query.trim().toLowerCase();
  return cards.filter((c) => {
    if (q && !c.title.toLowerCase().includes(q)) return false;
    if (state === 'all') return true;
    return (heat[c.id]?.state ?? 'unknown') === state;
  });
}

export function MobileCardList({ graph }: { graph: BoardGraph }) {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [state, setState] = useState<Filter>('all');
  const [heat, setHeat] = useState<RetrievabilityMap>({});
  const [open, setOpen] = useState<string | null>(null);
  useEffect(() => {
    void api<RetrievabilityMap>(`/v1/review/retrievability?boardId=${graph.board.id}`).then((r) => {
      if (r.ok) setHeat(r.data);
    });
  }, [graph.board.id]);
  const cards = filterMobileCards(graph.cards, q, state, heat);
  const selected = graph.cards.find((c) => c.id === open);
  return (
    <div className="flex flex-col gap-3 md:hidden">
      <Input label={t('library.searchPlaceholder')} value={q} onChange={(e) => setQ(e.target.value)} />
      <div role="group" aria-label={t('library.filterArea')} className="flex flex-wrap gap-2">
        {states.map((s) => (
          <FilterChip key={s} pressed={state === s} onClick={() => setState(s)}>
            {s === 'all' ? t('library.all') : t(`mapState.${s as MapState}`)}
          </FilterChip>
        ))}
      </div>
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {cards.map((c) => {
          const entry = heat[c.id];
          const recall = entry ? `${Math.round(entry.r * 100)}%` : null;
          return (
            <li key={c.id}>
              <button type="button" className="flex min-h-11 w-full items-center justify-between gap-3 rounded-2xl border border-border bg-surface px-4 py-3 text-left" onClick={() => setOpen(c.id)}>
                <span className="font-semibold">{c.title}</span>
                <span className="flex shrink-0 items-center gap-2 text-sm text-muted">
                  <span>{t(`mapState.${entry?.state ?? 'unknown'}`)}</span>
                  {recall ? <span>{recall}</span> : null}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {selected ? (
        <div className="fixed inset-x-0 bottom-0 z-50 flex max-h-[70dvh] flex-col gap-3 overflow-auto rounded-t-3xl border border-border bg-surface p-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
          <h2 className="m-0 text-xl font-bold">{selected.title}</h2>
          <p className="m-0 text-sm text-muted">{selected.back ?? selected.front}</p>
          {selected.source ? <p className="m-0 text-sm text-muted">{t('editorial.source', { fonte: selected.source })}</p> : null}
          <Button onClick={() => router.push(`/mapas/${graph.board.id}?modo=desafio`)}>{t('map.inspector.reviewThis')}</Button>
          <p className="m-0 text-sm text-muted">{t('editorial.editOnComputer')}</p>
          <Button variant="secondary" onClick={() => setOpen(null)}>{t('common.close')}</Button>
        </div>
      ) : null}
    </div>
  );
}
