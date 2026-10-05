'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { t } from '@remoa/strings';
import { Button } from '@remoa/ui';
import { track } from '@/lib/analytics';
import { api } from '@/lib/api';
import { usePaywall } from '@/features/billing/paywall';

type Seed = { id: string; title: string; area: string; temporalMark: string | null; reviewerName?: string | null; reviewerCrm?: string | null; approvedAt?: string | null };

function areaLabel(area: string) {
  switch (area) {
    case 'CM': return t('boards.area.CM');
    case 'CIR': return t('boards.area.CIR');
    case 'GO': return t('boards.area.GO');
    case 'PED': return t('boards.area.PED');
    case 'MP': return t('boards.area.MP');
    default: return area;
  }
}

function grouped(seeds: Seed[]) {
  const groups = new Map<string, Seed[]>();
  for (const seed of seeds) groups.set(seed.area, [...(groups.get(seed.area) ?? []), seed]);
  return [...groups];
}

export function SeedsView() {
  const router = useRouter();
  const paywall = usePaywall();
  const [seeds, setSeeds] = useState<Seed[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState(false);
  useEffect(() => {
    void api<Seed[]>('/v1/editorial/seeds').then((r) => {
      if (r.ok) {
        setSeeds(r.data);
        setStatus('ready');
      } else setStatus('error');
    });
  }, []);
  async function copy(boardId: string) {
    setError(false);
    const r = await api<{ id: string }>('/v1/editorial/copy', { method: 'POST', body: JSON.stringify({ boardId }) });
    if (r.ok) {
      track('board_created', {});
      track('seed_board_copied', {});
      router.push(`/app/mapas/${r.data.id}`);
    } else if (!paywall.handle(r.error)) setError(true);
  }
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <h1 className="m-0 font-display text-3xl font-extrabold">{t('editorial.seeds')}</h1>
      {error || status === 'error' ? <p role="alert" className="m-0 text-sm font-semibold text-review">{t('errors.internal')}</p> : null}
      {status === 'loading' ? <p className="m-0 text-muted">{t('common.loading')}</p> : null}
      {status === 'ready' && seeds.length === 0 ? <p className="m-0 text-muted">{t('newMap.seedSoon')}</p> : null}
      {status === 'ready' ? grouped(seeds).map(([area, items]) => (
        <section key={area} aria-label={areaLabel(area)} className="flex flex-col gap-3">
          <h2 className="m-0 text-lg font-bold">{areaLabel(area)}</h2>
          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {items.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 rounded-3xl border border-border bg-surface p-4">
                <span>
                  <span className="block font-semibold">{s.title}</span>
                  <span className="block text-sm text-muted">{s.temporalMark}</span>
                  {s.reviewerName && s.reviewerCrm ? (
                    <span className="block text-sm text-muted">
                      {t('editorial.provenance', { name: s.reviewerName, crm: s.reviewerCrm, date: s.approvedAt ? new Date(s.approvedAt).toLocaleDateString('pt-BR') : '—' })}
                    </span>
                  ) : null}
                </span>
                <Button size="sm" onClick={() => void copy(s.id)}>{t('editorial.copy')}</Button>
              </li>
            ))}
          </ul>
        </section>
      )) : null}
    </div>
  );
}
