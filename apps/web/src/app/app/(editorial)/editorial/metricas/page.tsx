import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { t } from '@remoa/strings';
import { serverApi } from '@/lib/api/server';

export const metadata: Metadata = { title: t('editorial.metrics') };

type Metrics = { submitted: number; overridden: number; agreement: number | null };

/** F11 FR-6: grader agreement for reviewers, 1 − overridden/submitted. */
export default async function Page() {
  const metrics = await serverApi<Metrics>('/v1/editorial/metrics');
  if (!metrics.ok && (metrics.error.code === 'not_found' || metrics.error.code === 'forbidden')) notFound();
  if (!metrics.ok) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
        <h1 className="m-0 font-display text-3xl font-extrabold">{t('editorial.metrics')}</h1>
        <p className="m-0 text-muted">{t('editorial.metricsError')}</p>
      </div>
    );
  }
  const agreement = metrics.data.agreement == null ? '—' : `${Math.round(metrics.data.agreement * 100)}%`;
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <h1 className="m-0 font-display text-3xl font-extrabold">{t('editorial.metrics')}</h1>
      <p className="m-0 text-4xl font-extrabold">{agreement}</p>
      <p className="m-0 text-sm text-muted">{t('editorial.metricsCounts', { overridden: metrics.data.overridden, submitted: metrics.data.submitted })}</p>
      <Link href="/app/editorial" className="text-sm font-semibold text-primary-deep no-underline">{t('editorial.title')}</Link>
    </div>
  );
}
