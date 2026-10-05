'use client';

import { useState, type ReactNode } from 'react';
import type { ReviewHub } from '@remoa/contracts';
import { t } from '@remoa/strings';
import { ColumnChart, Donut, Heatmap, KpiCard, LineChart, Segmented } from '@remoa/ui';
import { parseDay, SectionCard } from './section-card';
import { useCountUp } from './use-count-up';

const fmt = (d: Date, o: Intl.DateTimeFormatOptions) => d.toLocaleDateString('pt-BR', o);
const tableLabel = t('review.hub.table');
const pct = (v: number) => Math.round(v * 100);
const icon = (children: ReactNode) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{children}</svg>
);

export function Indicators({ kpis }: { kpis: ReviewHub['kpis'] }) {
  const n = useCountUp(900);
  const week = (['d0', 'd1', 'd2', 'd3', 'd4', 'd5', 'd6'] as const).map((k, i) => ({ label: t(`review.hub.kpi.weekDays.${k}`), on: kpis.weekDots[i] ?? false }));
  const ret = kpis.retention30;
  const delta = kpis.retentionDelta;
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard
        index={0}
        label={t('review.hub.kpi.streak')}
        value={String(n(kpis.streak))}
        unit={t('review.hub.kpi.streakUnit')}
        sub={t('review.hub.kpi.streakSub', { n: kpis.bestStreak })}
        iconTone="review"
        icon={icon(<path d="M12 3c1 4 5 5.5 5 10a5 5 0 01-10 0c0-2 1-3.2 2-4.2.3 1.2 1 2 2 2.2C11 9 11 6 12 3z" />)}
        dots={week}
        extraLabel={t('review.hub.kpi.weekLabel', { n: week.filter((d) => d.on).length })}
      />
      <KpiCard
        index={1}
        label={t('review.hub.kpi.retention')}
        value={ret == null ? '—' : String(n(pct(ret)))}
        unit={ret == null ? undefined : '%'}
        sub={delta == null ? t('review.hub.kpi.retentionNoDelta') : t('review.hub.kpi.retentionDelta', { delta: `${delta > 0 ? '+' : ''}${delta}` })}
        icon={icon(<><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.2" /></>)}
        bar={{ pct: ret == null ? 0 : ret * 100, target: 90 }}
        extraLabel={ret == null ? undefined : t('review.hub.kpi.retentionLabel', { n: pct(ret) })}
      />
      <KpiCard
        index={2}
        label={t('review.hub.kpi.reviews')}
        value={String(n(kpis.reviews7))}
        unit={t('review.hub.kpi.reviewsUnit')}
        sub={t('review.hub.kpi.reviewsSub', { n: Math.round(kpis.reviews7 / 7) })}
        icon={icon(<path d="M5 12l5 5L20 6" />)}
      />
      <KpiCard
        index={3}
        label={t('review.hub.kpi.firm')}
        value={String(n(kpis.firmPct))}
        unit="%"
        sub={t('review.hub.kpi.firmSub', { n: kpis.firm, total: kpis.firmTotal })}
        iconTone="steady"
        icon={icon(<path d="M12 3l8 3v6c0 4.5-3.2 7.8-8 9-4.8-1.2-8-4.5-8-9V6z" />)}
        bar={{ pct: kpis.firmPct }}
        extraLabel={t('review.hub.kpi.firmLabel', { n: kpis.firmPct })}
      />
    </div>
  );
}

export function Forecast({ forecast }: { forecast: ReviewHub['forecast'] }) {
  const items = forecast.map((f, i) => {
    const d = parseDay(f.date);
    return {
      id: f.date,
      label: i === 0 ? t('review.hub.forecast.todayLower') : `${fmt(d, { weekday: 'short' }).replace('.', '')} ${d.getDate()}`,
      full: i === 0 ? t('review.hub.forecast.today') : fmt(d, { weekday: 'short', day: 'numeric', month: 'short' }),
      value: f.count,
      highlight: i === 0,
    };
  });
  const peakI = items.reduce((best, it, i) => (i > 0 && it.value > (items[best]?.value ?? -1) ? i : best), 1);
  const peak = items[peakI];
  const peakText = peak && peak.value > 0 ? t('review.hub.forecast.peak', { day: fmt(parseDay(peak.id), { weekday: 'long', day: 'numeric' }), n: peak.value }) : '';
  return (
    <SectionCard chart="forecast"
      id="t-prev"
      title={t('review.hub.forecast.title')}
      sub={peakText || undefined}
      right={
        <span className="flex items-center gap-3.5 text-xs text-muted">
          <span className="flex items-center gap-1.5"><span aria-hidden="true" className="size-2.5 rounded-[3px] bg-primary" />{t('review.hub.forecast.today')}</span>
          <span className="flex items-center gap-1.5"><span aria-hidden="true" className="size-2.5 rounded-[3px] bg-steady-on-dark" />{t('review.hub.forecast.planned')}</span>
        </span>
      }
    >
      <ColumnChart
        items={items}
        summary={t('review.hub.forecast.summary', { peak: peakText })}
        valueLabel={(i) => t('review.hub.forecast.value', { n: i.value })}
        tableHeaders={[t('review.hub.forecast.head.day'), t('review.hub.forecast.head.count')]}
        tableToggleLabel={tableLabel}
        emptyText={t('review.hub.forecast.empty')}
      />
    </SectionCard>
  );
}

export function States({ states }: { states: ReviewHub['states'] }) {
  const segments = [
    { id: 'review', label: t('review.hub.states.due'), value: states.review, color: 'var(--state-review-border)' },
    { id: 'watch', label: t('review.hub.states.watch'), value: states.watch, color: 'var(--state-watch-border)' },
    { id: 'steady', label: t('review.hub.states.steady'), value: states.steady, color: 'var(--primary)' },
    { id: 'unknown', label: t('review.hub.states.new'), value: states.unknown, color: 'var(--state-unknown-soft)' },
  ];
  return (
    <SectionCard chart="states" id="t-est" title={t('review.hub.states.title')} sub={t('review.hub.states.sub')}>
      <Donut
        segments={segments}
        summary={t('review.hub.states.summary', { due: states.review, watch: states.watch, steady: states.steady, new: states.unknown })}
        totalLabel={t('review.hub.states.total')}
        tableHeaders={[t('review.hub.states.head.state'), t('review.hub.states.head.count')]}
        tableToggleLabel={tableLabel}
      />
    </SectionCard>
  );
}

type Range = 'r7' | 'r30' | 'r90';
const RANGE_KEY = { r7: 'd7', r30: 'd30', r90: 'd90' } as const;

export function Retention({ retention }: { retention: ReviewHub['retention'] }) {
  const [range, setRange] = useState<Range>('r30');
  const points = retention[RANGE_KEY[range]].flatMap((p) => (p.value == null ? [] : [{ id: p.date, value: p.value * 100, date: fmt(parseDay(p.date), { day: 'numeric', month: 'short' }) }]));
  const avg = points.length ? points.reduce((a, p) => a + p.value, 0) / points.length : null;
  const avgText = avg == null ? t('review.hub.retention.noAvg') : t('review.hub.retention.avg', { n: Math.round(avg) });
  return (
    <SectionCard chart="retention"
      id="t-ret"
      title={t('review.hub.retention.title')}
      sub={avgText}
      right={
        <Segmented
          aria-label={t('review.hub.retention.range')}
          value={range}
          onValueChange={(v) => setRange(v as Range)}
          options={[
            { value: 'r7', label: t('review.hub.retention.r7') },
            { value: 'r30', label: t('review.hub.retention.r30') },
            { value: 'r90', label: t('review.hub.retention.r90') },
          ]}
        />
      }
    >
      <LineChart
        points={points}
        summary={t('review.hub.retention.summary', { range: t(`review.hub.retention.${range}`), avg: avgText })}
        valueLabel={(p) => `${Math.round(p.value)}%`}
        tableHeaders={[t('review.hub.retention.head.date'), t('review.hub.retention.head.value')]}
        tableToggleLabel={tableLabel}
        yMin={70}
        yMax={100}
        yTicks={[70, 80, 90, 100]}
        formatTick={(v) => `${v}%`}
        target={{ value: 90, label: '90%' }}
        fromLabel={t(`review.hub.retention.from.${range}`)}
        toLabel={t('review.hub.retention.today')}
        emptyText={t('review.hub.retention.empty')}
        animationKey={range}
      />
    </SectionCard>
  );
}

export function Activity({ activity }: { activity: ReviewHub['activity'] }) {
  const total = activity.reduce((a, c) => a + c.count, 0);
  const cells = activity.map((c) => ({
    id: c.date,
    level: c.level as 0 | 1 | 2 | 3 | 4,
    future: c.future,
    label: t('review.hub.activity.cell', { n: c.count, date: fmt(parseDay(c.date), { weekday: 'long', day: 'numeric', month: 'long' }) }),
  }));
  return (
    <SectionCard chart="activity" id="t-ati" title={t('review.hub.activity.title')} sub={t('review.hub.activity.sub')}>
      <Heatmap
        cells={cells}
        summary={t('review.hub.activity.summary', { n: total })}
        idleCaption={t('review.hub.activity.idle')}
        lessLabel={t('review.hub.activity.less')}
        moreLabel={t('review.hub.activity.more')}
        tableHeaders={[t('review.hub.activity.head.day'), t('review.hub.activity.head.activity')]}
        tableToggleLabel={tableLabel}
      />
    </SectionCard>
  );
}
