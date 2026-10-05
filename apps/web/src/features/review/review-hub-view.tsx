'use client';

import { useEffect, useMemo, useState } from 'react';
import { REVIEW_SESSION_MAX, type Entitlements, type QueueFilter, type ReviewHub } from '@remoa/contracts';
import { t } from '@remoa/strings';
import { track } from '@/lib/analytics';
import { useChallenge } from '@/features/challenge/provider';
import { useNavigate } from '@/features/shell/use-navigate';
import { Activity, Forecast, Indicators, Retention, States } from './charts-section';
import { Areas, HardCards, NoData, PerMap } from './focus-section';
import { computeQueue, DEFAULT_CHIPS, type Chips, type Reason } from './hub-math';
import { QueuePanel } from './queue-panel';
import { rememberQueue } from './queue-cache';

const TZ = 'America/Sao_Paulo'; // fixed: server and browser must render the same greeting (no hydration mismatch)
const greeting = (at: Date) => {
  const h = Number(at.toLocaleString('en-GB', { hour: '2-digit', hourCycle: 'h23', timeZone: TZ }));
  return t(h < 12 ? 'review.hub.greet.morning' : h < 18 ? 'review.hub.greet.afternoon' : 'review.hub.greet.night');
};

/** G15 / F21: the whole /app/revisar page from one `ReviewHub`. Chips and maps recompute the queue here, with no request (FR-3). */
export function ReviewHubView({ hub, plan }: { hub: ReviewHub; plan: Entitlements['plan'] }) {
  const [navigating, router] = useNavigate();
  const { begin, state } = useChallenge();
  const [chips, setChips] = useState<Chips>(DEFAULT_CHIPS);
  const [boards, setBoards] = useState<ReadonlySet<string>>(() => new Set(hub.maps.map((m) => m.boardId)));
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const model = useMemo(() => computeQueue(hub, boards, chips), [hub, boards, chips]);

  useEffect(() => {
    track('revisar_opened', { due: hub.queue.counts.due, new: hub.queue.counts.new, weak: hub.queue.counts.weak });
    void rememberQueue({ items: hub.queue.items.filter((i) => i.reason !== 'weak'), boardTitles: Object.fromEntries(hub.maps.map((m) => [m.boardId, m.title])) });
  }, [hub]);

  // FR-6: coming back from a finished session, re-read the server so the ring and the rail badge show the new numbers
  useEffect(() => {
    if (state.phase === 'done') router.refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per visit
  }, []);

  const start = async (filter: QueueFilter, limit: number) => {
    setBusy(true);
    setFailed(false);
    const count = Math.min(Math.max(1, limit), REVIEW_SESSION_MAX);
    if (filter.area) track('revisar_area_clicked', { area: filter.area });
    track('revisar_session_started', { count, reasons: filter.ahead ? [] : (filter.reasons ?? ['due', 'new']), maps: filter.boardIds?.length ?? hub.maps.length, ahead: !!filter.ahead, area: filter.area ?? null });
    const first = await begin({ kind: 'daily' }, count, undefined, filter);
    // G01 T6: the daily session runs inside the map of its first item
    if (first) router.push(`/app/mapas/${first.boardId}?modo=desafio&sessao=diaria`);
    else {
      setBusy(false);
      setFailed(true);
    }
  };
  const reasons = (['due', 'new', 'weak'] as const).filter((r) => chips[r]);
  const at = new Date(hub.generatedAt);
  const hasCards = hub.status !== 'empty';
  const title = !hasCards ? t('review.hub.title.empty', { greet: greeting(at) }) : model.size > 0 ? t('review.hub.title.pending', { greet: greeting(at), n: model.size }) : t('review.hub.title.done', { greet: greeting(at) });
  const noCharts = hub.status === 'empty' || hub.status === 'no_history';

  return (
    <div className="-m-4 box-border flex flex-col gap-7 px-4 py-6 md:-m-6 md:px-12 md:pb-[72px] md:pt-8">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-bold uppercase tracking-[.12em] text-muted">{t('rail.review')}</span>
          <h1 className="m-0 font-display text-[32px] font-extrabold leading-[1.05] tracking-[-.04em] md:text-[42px]">{title}</h1>
        </div>
        <span className="text-[15px] text-muted">{at.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: TZ })}</span>
      </div>

      <QueuePanel
        hub={hub}
        plan={plan}
        model={model}
        chips={chips}
        onChip={(r: Reason, on) => setChips((c) => ({ ...c, [r]: on }))}
        boards={boards}
        onBoard={(id, on) =>
          setBoards((b) => {
            const next = new Set(b);
            if (on) next.add(id);
            else next.delete(id);
            return next;
          })
        }
        starting={busy || navigating}
        failed={failed}
        onStart={() => void start({ reasons, boardIds: [...boards] }, model.size)}
        onAhead={() => void start({ ahead: true }, hub.queue.aheadCount)}
      />

      {noCharts ? (
        <NoData empty={hub.status === 'empty'} />
      ) : (
        <div className="flex flex-col gap-7">
          <Indicators kpis={hub.kpis} />
          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
            <Forecast forecast={hub.forecast} />
            <States states={hub.states} />
          </div>
          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
            <Retention retention={hub.retention} />
            <Activity activity={hub.activity} />
          </div>
          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
            <Areas areas={hub.areas} onStart={(f) => void start(f, REVIEW_SESSION_MAX)} />
            <HardCards cards={hub.hardCards} />
          </div>
          <PerMap maps={hub.maps} onStart={(f) => void start(f, REVIEW_SESSION_MAX)} />
        </div>
      )}
    </div>
  );
}
