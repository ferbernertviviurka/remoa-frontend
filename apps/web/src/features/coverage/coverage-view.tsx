'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { matrixAreas, type BoardSummary, type CoverageRow, type HomeSummary, type MatrixArea, type MatrixItem } from '@remoa/contracts';
import { t } from '@remoa/strings';
import { Button, FilterChip, Input, Pill, Progress, Ring, Segmented, Stat, useToast, type PillProps } from '@remoa/ui';
import { track } from '@/lib/analytics';
import { api } from '@/lib/api';
import { LinkDialog, TopicActions, linkCls } from './coverage-gaps';
import { boardsOfItem, buildGroups, countStates, suggestTopics, type TopicEntry, type TopicState } from './coverage-logic';

export type CoverageViewProps = { rows: CoverageRow[]; items: MatrixItem[]; summary: Pick<HomeSummary, 'dueToday'>; boards: BoardSummary[] };

const areaOptions = matrixAreas.map((a) => ({ value: a, label: t(`boards.area.${a}`) }));
const pct = (n: number) => Math.round(n);

/** Mean coverage over ALL catalog topics of the area (groups excluded); an unlinked topic counts 0 (FR-4). */
export function catalogCoverage(items: MatrixItem[], rows: CoverageRow[]): number {
  const topics = items.filter((i) => !items.some((c) => c.parentId === i.id));
  if (topics.length === 0) return 0;
  const byItem = new Map(rows.map((r) => [r.matrixItemId, r.coverage]));
  return topics.reduce((sum, i) => sum + (byItem.get(i.id) ?? 0), 0) / topics.length;
}

const stateTone: Record<TopicState, NonNullable<PillProps['tone']>> = { gap: 'unknown', partial: 'watch', covered: 'steady' };
const stateKey = { gap: 'coverage.stateGap', partial: 'coverage.statePartial', covered: 'coverage.stateCovered' } as const;
const filters: Array<TopicState | 'all'> = ['all', 'gap', 'partial', 'covered'];

function TopicRow({ entry, boards, onLink }: { entry: TopicEntry; boards: BoardSummary[]; onLink: (i: MatrixItem) => void }) {
  const { item, row, state } = entry;
  const linked = boardsOfItem(boards, item.id);
  const value = row ? pct(row.coverage) : 0;
  return (
    <li className="flex flex-col gap-2 border-t border-track py-3 sm:grid sm:grid-cols-[minmax(0,1fr)_minmax(0,220px)_auto] sm:items-center sm:gap-x-5">
      <span className="flex flex-col gap-1">
        <span className="font-semibold">{item.title}</span>
        <span className="flex flex-wrap items-center gap-2 text-sm text-muted">
          <Pill tone={stateTone[state]}>{t(stateKey[state])}</Pill>
          {row ? <span>{t('coverage.mapCount')}: {row.boards}</span> : <span>{t('coverage.target', { n: item.targetCards })}</span>}
          {row?.avgRetrievability != null ? <span>{t('coverage.recallInline', { pct: pct(row.avgRetrievability * 100) })}</span> : null}
        </span>
      </span>
      <span className="grid grid-cols-[minmax(0,1fr)_48px] items-center gap-3">
        <Progress aria-label={t('coverage.topicBar', { topic: item.title })} value={value} />
        <span className="text-right font-display text-lg font-extrabold tabular-nums">{value}%</span>
      </span>
      <span className="flex flex-wrap items-center gap-1 sm:justify-end">
        {state === 'gap' ? (
          <>
            <Link href={`/app/mapas/novo?item=${item.id}`} aria-label={t('coverage.createMapFor', { topic: item.title })} className={linkCls}>{t('coverage.createMap')}</Link>
            <Button size="sm" variant="quiet" aria-label={t('coverage.linkExistingFor', { topic: item.title })} onClick={() => onLink(item)}>{t('coverage.linkExisting')}</Button>
          </>
        ) : linked[0] ? (
          <Link href={`/app/mapas/${linked[0].id}`} aria-label={t('coverage.openMapFor', { topic: item.title })} className={linkCls}>
            {t('coverage.openMap')}{linked.length > 1 ? ` ${t('coverage.openMapMore', { n: linked.length - 1 })}` : ''}
          </Link>
        ) : null}
      </span>
    </li>
  );
}

export function CoverageView({ rows: initialRows, items, summary, boards: initialBoards }: CoverageViewProps) {
  const [area, setArea] = useState<MatrixArea>(matrixAreas[0]);
  const [rows, setRows] = useState(initialRows);
  const [boards, setBoards] = useState(initialBoards);
  const [filter, setFilter] = useState<TopicState | 'all'>('all');
  const [query, setQuery] = useState('');
  const [linking, setLinking] = useState<MatrixItem | null>(null);
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();
  useEffect(() => track('coverage_viewed', {}), []);

  const pick = useCallback(
    async (board: BoardSummary) => {
      if (!linking) return;
      setBusy(true);
      try {
        const r = await api('/v1/matrix/links', { method: 'POST', body: JSON.stringify({ boardId: board.id, matrixItemId: linking.id }) });
        if (!r.ok) throw new Error(r.error.code);
        track('board_linked_to_matrix', { count: 1, suggestedCount: 0 });
        const [cov, bs] = await Promise.all([api<CoverageRow[]>('/v1/coverage'), api<BoardSummary[]>('/v1/boards')]);
        if (cov.ok) setRows(cov.data);
        if (bs.ok) setBoards(bs.data);
        toast({ title: t('coverage.linkDone', { map: board.title, topic: linking.title }) });
        setLinking(null);
      } catch {
        toast({ title: t('coverage.linkError'), tone: 'danger' });
      } finally {
        setBusy(false);
      }
    },
    [linking, toast],
  );

  const areaItems = items.filter((i) => i.area === area);
  const areaRows = rows.filter((r) => r.area === area);
  const counts = countStates(areaItems, areaRows);
  const topicCount = counts.gap + counts.partial + counts.covered;
  const overall = pct(catalogCoverage(areaItems, areaRows));
  const groups = buildGroups(areaItems, areaRows, filter, query);
  const next = suggestTopics(areaItems.filter((i) => !areaRows.some((r) => r.matrixItemId === i.id)));
  const noLinks = rows.length === 0;
  const filtering = filter !== 'all' || query.trim() !== '';
  const sectionCls = 'flex flex-col gap-4 rounded-[28px] border border-border bg-surface px-4 py-5 sm:px-7 sm:py-[26px]';
  const h2Cls = 'm-0 font-display text-[26px] font-extrabold tracking-[-0.025em]';

  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex max-w-[720px] flex-col gap-2">
          <h1 className="m-0 font-display text-[32px] font-extrabold leading-[1.1] md:text-[40px] md:leading-[1.05] tracking-[-0.035em]">{t('empty.coverage.title')}</h1>
          <p className="m-0 text-muted">{t('coverage.explain')}</p>
        </div>
        <Segmented aria-label={t('coverage.areaFilter')} options={areaOptions} value={area} onValueChange={(v) => setArea(v as MatrixArea)} />
      </div>
      <section aria-label={t('coverage.summaryLabel')} className="grid gap-4 sm:grid-cols-4">
        <div className="flex items-center gap-5 rounded-[28px] border border-border bg-surface px-5 py-5 sm:col-span-2">
          <Ring tone="primary" size={96} value={overall} max={100} label={t('coverage.heroRing', { pct: overall })} />
          <div className="flex min-w-0 flex-col gap-1">
            <span className="font-display text-[32px] font-extrabold leading-none tracking-[-0.03em]">{overall}%</span>
            <span className="font-semibold">{t('coverage.catalog')}</span>
            <span className="text-sm text-muted">{t('coverage.heroSub', { covered: counts.covered, partial: counts.partial, gaps: counts.gap })}</span>
          </div>
        </div>
        <Stat label={t('coverage.reviewToday')} value={String(summary.dueToday)} hint={t('coverage.reviewTodayHint', { n: summary.dueToday })} />
        <Stat label={t('coverage.maps')} value={String(boards.length)} />
      </section>
      {areaItems.length === 0 ? (
        <section className={sectionCls}><p className="m-0 text-muted">{t('coverage.noAreaItems')}</p></section>
      ) : noLinks ? (
        <section aria-labelledby="cov-empty" className={sectionCls}>
          <h2 id="cov-empty" className={h2Cls}>{t('coverage.gapsTitle')}</h2>
          <p className="m-0">{t('coverage.emptyIntro1')}</p>
          <p className="m-0 text-muted">{t('coverage.emptyIntro2')}</p>
          <ul aria-label={t('coverage.emptySuggestionsLabel')} className="m-0 list-none p-0">
            {suggestTopics(areaItems).map((i) => <TopicActions key={i.id} topic={i} onLink={setLinking} />)}
          </ul>
          <div><Link href="/app/mapas" className="inline-flex min-h-11 items-center rounded-btn bg-primary px-5 font-bold text-on-primary no-underline hover:brightness-110">{t('coverage.myMaps')}</Link></div>
        </section>
      ) : (
        <>
          {next.length > 0 ? (
            <section aria-labelledby="cov-next" className={sectionCls}>
              <h2 id="cov-next" className={h2Cls}>{t('coverage.nextTitle')}</h2>
              <p className="m-0 font-semibold">{t('coverage.gapsCount', { gaps: counts.gap, total: topicCount })}</p>
              <p className="m-0 text-muted">{t('coverage.nextHint')}</p>
              <ul className="m-0 flex list-none flex-col p-0 sm:flex-row sm:flex-wrap sm:gap-3">
                {next.map((i) => (
                  <li key={i.id} className="flex flex-1 basis-[220px] flex-col items-start gap-1 rounded-[20px] border border-border bg-bg px-4 py-3">
                    <span className="font-semibold">{i.title}</span>
                    <span className="text-sm text-muted">{t('coverage.target', { n: i.targetCards })}</span>
                    <Link href={`/app/mapas/novo?item=${i.id}`} aria-label={t('coverage.createMapFor', { topic: i.title })} className={`${linkCls}`}>{t('coverage.createMap')}</Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : (
            <p className="m-0 font-semibold">{t('coverage.gapsNone')}</p>
          )}
          <section aria-labelledby="cov-groups" className={sectionCls}>
            <h2 id="cov-groups" className={h2Cls}>{t('coverage.groupsTitle')}</h2>
            <p className="m-0 text-muted">{t('coverage.groupsHint')}</p>
            <div className="flex flex-wrap items-center gap-3">
              <div role="group" aria-label={t('coverage.filterLabel')} className="flex flex-wrap gap-2">
                {filters.map((f) => (
                  <FilterChip key={f} pressed={filter === f} count={f === 'all' ? topicCount : counts[f]} onClick={() => setFilter(f)}>
                    {f === 'all' ? t('coverage.filterAll') : t(stateKey[f])}
                  </FilterChip>
                ))}
              </div>
              <div className="min-w-[200px] flex-1 sm:max-w-[320px]">
                <Input variant="search" type="search" label={t('coverage.searchLabel')} placeholder={t('coverage.searchPlaceholder')} value={query} onChange={(e) => setQuery(e.target.value)} />
              </div>
            </div>
            <p className="sr-only" role="status">{t('coverage.groupsCount', { n: groups.reduce((n, g) => n + g.topics.length, 0) })}</p>
            {groups.length === 0 ? (
              <div className="flex flex-col items-start gap-2">
                <p className="m-0 text-muted">{t('coverage.noResults')}</p>
                {filtering ? <Button variant="secondary" onClick={() => { setFilter('all'); setQuery(''); }}>{t('coverage.clearFilters')}</Button> : null}
              </div>
            ) : (
              groups.map(({ group, topics, pct: gp }) => {
                const name = group?.title ?? t('coverage.gapsNoGroup');
                return (
                  <div key={group?.id ?? 'root'} role="group" aria-label={name} className="flex flex-col">
                    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 pt-2">
                      <h3 className="m-0 text-base font-bold">{name}</h3>
                      <span className="grid w-full max-w-[280px] grid-cols-[minmax(0,1fr)_auto] items-center gap-3 text-sm text-muted">
                        <Progress aria-label={t('coverage.groupBar', { group: name })} value={pct(gp)} />
                        <span>{t('coverage.groupSummary', { n: topics.length, pct: pct(gp) })}</span>
                      </span>
                    </div>
                    <ul className="m-0 list-none p-0">
                      {topics.map((e) => <TopicRow key={e.item.id} entry={e} boards={boards} onLink={setLinking} />)}
                    </ul>
                  </div>
                );
              })
            )}
          </section>
        </>
      )}
      <p className="m-0 max-w-[720px] text-[13px] leading-normal text-muted">{t('coverage.footer')}</p>
      <LinkDialog topic={linking} boards={boards} busy={busy} onPick={(b) => void pick(b)} onClose={() => setLinking(null)} />
    </div>
  );
}
