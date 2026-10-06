'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { ProgressSummary } from '@remoa/contracts';
import { withStrings } from '@remoa/strings';
import * as more from '@remoa/strings/ns';
import { DailyBarChart, Button } from '@remoa/ui';
import { track } from '@/lib/analytics';

const t = withStrings({ progress: more.progress });

const pct = (n: number | null) => (n == null ? t('progress.none') : `${Math.round(n * 100)}%`);

export function ProgressView({ summary }: { summary: ProgressSummary }) {
  const [exportError, setExportError] = useState(false);
  useEffect(() => { track('progress_viewed', {}); }, []);
  async function downloadCsv() {
    setExportError(false);
    try {
      const { data } = await (await import('@/lib/supabase/client')).createClient().auth.getSession();
      const token = data.session?.access_token;
      const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
      const res = await fetch(`${base}/v1/reports/attempts.csv`, { headers: token ? { authorization: `Bearer ${token}` } : {} });
      if (!res.ok) {
        setExportError(true);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'tentativas.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setExportError(true);
    }
  }
  const dayLabel = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString('pt-BR');
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="m-0 font-display text-3xl font-extrabold">{t('progress.title')}</h1>
        <Button size="sm" variant="secondary" onClick={() => void downloadCsv()}>{t('progress.export')}</Button>
      </div>
      {exportError ? <p role="alert" className="m-0 text-sm font-semibold text-review">{t('progress.loadError')}</p> : null}
      <section className="grid gap-3 sm:grid-cols-3">
        <article className="rounded-3xl border border-border bg-surface p-5">
          <p className="m-0 text-sm text-muted">{t('progress.retention7')}</p>
          <p className="m-0 font-display text-3xl font-extrabold">{pct(summary.retention7d)}</p>
        </article>
        <article className="rounded-3xl border border-border bg-surface p-5">
          <p className="m-0 text-sm text-muted">{t('progress.retention30')}</p>
          <p className="m-0 font-display text-3xl font-extrabold">{pct(summary.retention30d)}</p>
        </article>
        <article className="rounded-3xl border border-border bg-surface p-5">
          <p className="m-0 text-sm text-muted">{t('progress.streak')}</p>
          <p className="m-0 font-display text-3xl font-extrabold">{summary.streakDays}</p>
        </article>
      </section>
      <section aria-label={t('progress.chart')} className="rounded-3xl border border-border bg-surface p-5">
        <h2 className="m-0 mb-3 text-lg font-bold">{t('progress.chart')}</h2>
        <DailyBarChart
          label={t('progress.chart')}
          items={summary.reviewsPerDay.map((d) => ({ id: d.date, value: d.count }))}
          barLabel={(item) => t('progress.dayCount', { date: dayLabel(item.id), n: item.value })}
        />
      </section>
      <section aria-label={t('progress.weak')}>
        <h2 className="m-0 text-lg font-bold">{t('progress.weak')}</h2>
        <p className="m-0 mb-3 text-sm text-muted">{t('progress.weakHint')}</p>
        {summary.weakCards.length === 0 ? <p className="m-0 text-sm text-muted">{t('progress.weakEmpty')}</p> : null}
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {summary.weakCards.map((c) => (
            <li key={c.cardId} className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface px-4 py-3">
              <span className="font-semibold">{c.title}</span>
              <span className="flex items-center gap-3">
                <span className="text-sm text-muted">{pct(c.r)}</span>
                <Link href={`/app/mapas/${c.boardId}?modo=desafio`} className="font-semibold text-primary-deep no-underline">{t('progress.review')}</Link>
              </span>
            </li>
          ))}
        </ul>
      </section>
      <section aria-label={t('progress.accuracy')}>
        <h2 className="m-0 mb-3 text-lg font-bold">{t('progress.accuracy')}</h2>
        {summary.accuracy.length === 0 ? <p className="m-0 text-sm text-muted">{t('progress.accuracyEmpty')}</p> : null}
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {summary.accuracy.map((a) => (
            <li key={a.matrixItemId ?? a.area} className="flex justify-between rounded-2xl border border-border bg-surface px-4 py-3">
              <span>{a.matrixItemId ? (a.label ?? t('progress.topic')) : t('progress.area')}</span>
              <span>{pct(a.accuracy)}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
