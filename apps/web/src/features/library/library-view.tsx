'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { withStrings } from '@remoa/strings';
import * as more from '@remoa/strings/ns';
import { Button, Input, Segmented, Select, Tag } from '@remoa/ui';
import { track } from '@/lib/analytics';
import { api } from '@/lib/api';
import { usePaywall } from '@/features/billing/paywall';

const t = withStrings({ boards: more.boards, mapLibrary: more.mapLibrary });
type StringKey = Parameters<typeof t>[0];

export type Seed = {
  id: string; title: string; area: string; temporalMark: string | null; version: number; badges: string[];
  contentVersion: string | null; cardCount: number; estimatedMinutes: number; levels: number[];
  reviewerName: string | null; reviewerCrm: string | null;
  /** D-1522: 'remoa' = institutional approval, no physician/CRM. */
  approvedBy?: 'reviewer' | 'remoa' | null;
};

const ALL = 'all';

/** F31 FR-43: shown on the library and on every ready-made map. */
export function Disclaimer() {
  return (
    <p className="m-0 text-sm text-muted">
      {t('mapLibrary.disclaimer')} <Link href="/termos-de-uso" className="font-semibold text-primary-deep underline">{t('mapLibrary.terms')}</Link>
    </p>
  );
}

export function SeedBadges({ badges }: { badges: string[] }) {
  return badges.includes('top10_enamed') ? <Tag tone="brand">{t('mapLibrary.badgeTop10')}</Tag> : null;
}

export function Provenance({ seed }: { seed: Pick<Seed, 'reviewerName' | 'reviewerCrm' | 'approvedBy'> }) {
  if (seed.approvedBy === 'remoa') return <span className="block text-sm text-muted">{t('mapLibrary.approvedByRemoa')}</span>;
  return seed.reviewerName && seed.reviewerCrm ? <span className="block text-sm text-muted">{t('mapLibrary.reviewedBy', { name: seed.reviewerName, crm: seed.reviewerCrm })}</span> : null;
}

/** FR-37/38: "Usar" copies through the plan (Q-170: Free gets one sample copy; the API answers 402 and the paywall opens). */
export function useSeedCopy() {
  const router = useRouter();
  const paywall = usePaywall();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  async function copy(boardId: string) {
    setBusy(true);
    setError(false);
    const r = await api<{ id: string }>('/v1/editorial/copy', { method: 'POST', body: JSON.stringify({ boardId }) });
    setBusy(false);
    if (r.ok) {
      track('board_created', {});
      track('seed_board_copied', {});
      router.push(`/app/mapas/${r.data.id}`);
    } else if (!paywall.handle(r.error)) setError(true);
  }
  return { copy, busy, error };
}

export function LibraryView() {
  const [seeds, setSeeds] = useState<Seed[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [area, setArea] = useState(ALL);
  const [level, setLevel] = useState(ALL);
  const [q, setQ] = useState('');
  const { copy, busy, error } = useSeedCopy();
  useEffect(() => {
    void api<Seed[]>('/v1/editorial/seeds').then((r) => {
      if (r.ok) setSeeds(r.data);
      setStatus(r.ok ? 'ready' : 'error');
    });
  }, []);
  const areas = useMemo(() => [...new Set(seeds.map((s) => s.area))], [seeds]);
  const shown = seeds.filter((s) => (area === ALL || s.area === area) && (level === ALL || s.levels.includes(Number(level))) && s.title.toLowerCase().includes(q.trim().toLowerCase()));
  const areaLabel = (a: string) => t(`boards.area.${a}` as StringKey);
  return (
    <div className="flex w-full flex-col gap-4">
      <div>
        <h2 className="m-0 font-display text-2xl font-extrabold">{t('mapLibrary.title')}</h2>
        <p className="m-0 mt-1 text-muted">{t('mapLibrary.lead')}</p>
      </div>
      <Disclaimer />
      {error || status === 'error' ? <p role="alert" className="m-0 text-sm font-semibold text-review">{t(status === 'error' ? 'mapLibrary.error' : 'mapLibrary.useError')}</p> : null}
      {status === 'loading' ? <p className="m-0 text-muted">{t('common.loading')}</p> : null}
      {status === 'ready' && seeds.length === 0 ? <p className="m-0 text-muted">{t('mapLibrary.none')}</p> : null}
      {status === 'ready' && seeds.length > 0 ? (
        <>
          <div role="group" aria-label={t('mapLibrary.filters')} className="flex flex-wrap items-end gap-3">
            <Input variant="search" label={t('mapLibrary.search')} placeholder={t('mapLibrary.search')} value={q} onChange={(e) => setQ(e.target.value)} />
            <Select label={t('mapLibrary.area')} value={area} onValueChange={setArea}
              options={[{ value: ALL, label: t('mapLibrary.allAreas') }, ...areas.map((a) => ({ value: a, label: areaLabel(a) }))]} />
            <Select label={t('mapLibrary.level')} value={level} onValueChange={setLevel}
              options={[{ value: ALL, label: t('mapLibrary.allLevels') }, ...[1, 2, 3].map((n) => ({ value: String(n), label: t('mapLibrary.levelN', { n }) }))]} />
          </div>
          {shown.length === 0 ? <p className="m-0 text-muted">{t('mapLibrary.empty')}</p> : (
            <ul className="m-0 grid list-none grid-cols-1 gap-3 p-0 md:grid-cols-2">
              {shown.map((s) => (
                <li key={s.id} className="flex flex-col gap-3 rounded-3xl border border-border bg-surface p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Tag tone="unknown">{areaLabel(s.area)}</Tag>
                    <SeedBadges badges={s.badges} />
                  </div>
                  <h3 className="m-0 text-lg font-bold">{s.title}</h3>
                  <p className="m-0 text-sm text-muted">
                    {[t('mapLibrary.cards', { n: s.cardCount }), t('mapLibrary.minutes', { n: s.estimatedMinutes }), t('mapLibrary.version', { v: s.contentVersion ?? s.version }), s.temporalMark ? t('mapLibrary.mark', { mark: s.temporalMark }) : null].filter(Boolean).join(' · ')}
                  </p>
                  <Provenance seed={s} />
                  <div className="flex gap-2">
                    <Link href={`/app/mapas/prontos/${s.id}`} className="inline-flex min-h-11 items-center rounded-btn border border-border-strong px-4 font-bold text-primary-deep">{t('mapLibrary.see')}<span className="sr-only">: {s.title}</span></Link>
                    <Button size="sm" disabled={busy} onClick={() => void copy(s.id)}>{t(busy ? 'mapLibrary.using' : 'mapLibrary.use')}</Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : null}
    </div>
  );
}

export function MapsTabs({ active }: { active: 'mine' | 'library' }) {
  const router = useRouter();
  return (
    <Segmented aria-label={t('mapLibrary.tabsLabel')} value={active} onValueChange={(v) => router.push(v === 'library' ? '/app/mapas?aba=biblioteca' : '/app/mapas')}
      options={[{ value: 'mine', label: t('mapLibrary.tabMine') }, { value: 'library', label: t('mapLibrary.tabLibrary') }]} />
  );
}
