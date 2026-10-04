'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { t } from '@remoa/strings';
import { Button } from '@remoa/ui';
import { track } from '@/lib/analytics';
import { api } from '@/lib/api';
import { usePaywall } from '@/features/billing/paywall';

type Seed = { id: string; title: string; area: string; temporalMark: string | null };

export function SeedsView() {
  const router = useRouter();
  const paywall = usePaywall();
  const [seeds, setSeeds] = useState<Seed[]>([]);
  const [error, setError] = useState(false);
  useEffect(() => {
    void api<Seed[]>('/v1/editorial/seeds').then((r) => { if (r.ok) setSeeds(r.data); });
  }, []);
  async function copy(boardId: string) {
    setError(false);
    const r = await api<{ id: string }>('/v1/editorial/copy', { method: 'POST', body: JSON.stringify({ boardId }) });
    if (r.ok) {
      track('board_created', {});
      track('seed_board_copied', {});
      router.push(`/mapas/${r.data.id}`);
    } else if (!paywall.handle(r.error)) setError(true);
  }
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <h1 className="m-0 font-display text-3xl font-extrabold">{t('editorial.seeds')}</h1>
      {error ? <p role="alert" className="m-0 text-sm font-semibold text-review">{t('errors.internal')}</p> : null}
      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {seeds.length === 0 ? <li className="text-muted">{t('newMap.seedSoon')}</li> : null}
        {seeds.map((s) => (
          <li key={s.id} className="flex items-center justify-between gap-3 rounded-3xl border border-border bg-surface p-4">
            <span>
              <span className="block font-semibold">{s.title}</span>
              <span className="text-sm text-muted">{s.temporalMark}</span>
            </span>
            <Button size="sm" onClick={() => void copy(s.id)}>{t('editorial.copy')}</Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
