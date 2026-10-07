'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { withStrings } from '@remoa/strings';
import * as more from '@remoa/strings/ns';
import { Button, FilterChip, GraphPreview, Input, Segmented, SkeletonBlock, SkeletonRegion, Tag } from '@remoa/ui';
import { track } from '@/lib/analytics';
import { api } from '@/lib/api';
import { usePaywall } from '@/features/billing/paywall';
import { PendingLink } from '@/features/shell/nav-pending';
import Link from 'next/link';

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
const emptyPreview = { nodes: [] as const, edges: [] as const };

/** F31 FR-43: shown on the library and on every ready-made map. */
export function Disclaimer() {
  return (
    <p className="m-0 text-sm text-muted">
      {t('mapLibrary.disclaimer')}{' '}
      <Link href="/termos-de-uso" className="font-semibold text-primary-deep underline">{t('mapLibrary.terms')}</Link>
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
  const [copyingId, setCopyingId] = useState<string | null>(null);
  const [error, setError] = useState(false);
  async function copy(boardId: string) {
    setCopyingId(boardId);
    setError(false);
    const r = await api<{ id: string }>('/v1/editorial/copy', { method: 'POST', body: JSON.stringify({ boardId }) });
    setCopyingId(null);
    if (r.ok) {
      track('board_created', {});
      track('seed_board_copied', {});
      router.push(`/app/mapas/${r.data.id}`);
    } else if (!paywall.handle(r.error)) setError(true);
  }
  return { copy, copyingId, error };
}

function seedMeta(s: Seed) {
  return [t('mapLibrary.cards', { n: s.cardCount }), t('mapLibrary.minutes', { n: s.estimatedMinutes }), t('mapLibrary.version', { v: s.contentVersion ?? s.version }), s.temporalMark ? t('mapLibrary.mark', { mark: s.temporalMark }) : null].filter(Boolean).join(' · ');
}

function SeedMapCard({ seed, areaLabel, copying, onCopy }: { seed: Seed; areaLabel: string; copying: boolean; onCopy: () => void }) {
  return (
    <article className="lift flex flex-col gap-3.5 rounded-list border border-border bg-surface p-3.5 text-ink">
      <GraphPreview preview={emptyPreview} height={132} />
      <div className="flex flex-col gap-2 px-1.5 pb-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-[.12em] text-muted">{areaLabel}</span>
          <SeedBadges badges={seed.badges} />
        </div>
        <span className="font-display text-[22px] font-bold leading-[1.15] tracking-[-0.02em]">{seed.title}</span>
        <span className="text-[13px] text-muted">{seedMeta(seed)}</span>
        <Provenance seed={seed} />
        <div className="mt-1 flex flex-wrap gap-2">
          <PendingLink
            href={`/app/mapas/prontos/${seed.id}`}
            className="inline-flex min-h-11 items-center rounded-btn border border-border-strong px-4 text-sm font-bold text-primary-deep no-underline"
          >
            {t('mapLibrary.see')}
            <span className="sr-only">: {seed.title}</span>
          </PendingLink>
          <Button size="sm" loading={copying} loadingLabel={t('mapLibrary.using')} disabled={copying} onClick={onCopy}>
            {t('mapLibrary.use')}
          </Button>
        </div>
      </div>
    </article>
  );
}

export function LibraryView() {
  const [seeds, setSeeds] = useState<Seed[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [area, setArea] = useState(ALL);
  const [level, setLevel] = useState(ALL);
  const [q, setQ] = useState('');
  const { copy, copyingId, error } = useSeedCopy();
  useEffect(() => {
    void api<Seed[]>('/v1/editorial/seeds').then((r) => {
      if (r.ok) setSeeds(r.data);
      setStatus(r.ok ? 'ready' : 'error');
    });
  }, []);
  const areas = useMemo(() => [...new Set(seeds.map((s) => s.area))], [seeds]);
  const shown = seeds.filter((s) => (area === ALL || s.area === area) && (level === ALL || s.levels.includes(Number(level))) && s.title.toLowerCase().includes(q.trim().toLowerCase()));
  const areaLabel = (a: string) => t(`boards.area.${a}` as StringKey);
  const summary = t('library.summary', { n: shown.length, cards: shown.reduce((n, s) => n + s.cardCount, 0), due: 0 });

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4 md:gap-6">
        <div className="flex flex-col gap-2">
          <span className="text-xs font-bold uppercase tracking-[.12em] text-muted">{t('mapLibrary.tabLibrary')}</span>
          <h1 className="m-0 font-display text-[34px] font-extrabold leading-[1.1] tracking-[-0.035em] text-ink md:text-[46px] md:leading-[1.05]">{t('mapLibrary.title')}</h1>
          <p className="m-0 text-[15px] text-muted">{t('mapLibrary.lead')}</p>
          {status === 'ready' ? <p className="m-0 text-[13px] text-muted">{summary}</p> : null}
        </div>
        {status === 'ready' && seeds.length > 0 ? (
          <div className="w-full md:w-auto">
            <Input variant="search" label={t('mapLibrary.search')} placeholder={t('mapLibrary.search')} value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        ) : null}
      </div>

      <Disclaimer />

      {error || status === 'error' ? <p role="alert" className="m-0 text-sm font-semibold text-review">{t(status === 'error' ? 'mapLibrary.error' : 'mapLibrary.useError')}</p> : null}

      {status === 'loading' ? (
        <SkeletonRegion label={t('common.loading')}>
          <div className="grid grid-cols-1 gap-[22px] md:grid-cols-2 xl:grid-cols-3">
            <SkeletonBlock height={300} radius={26} />
            <SkeletonBlock height={300} radius={26} />
            <SkeletonBlock height={300} radius={26} />
          </div>
        </SkeletonRegion>
      ) : null}

      {status === 'ready' && seeds.length === 0 ? <p className="m-0 text-muted">{t('mapLibrary.none')}</p> : null}

      {status === 'ready' && seeds.length > 0 ? (
        <>
          <div role="group" aria-label={t('mapLibrary.filters')} className="flex flex-wrap gap-2.5">
            <FilterChip pressed={area === ALL} count={seeds.length} onClick={() => setArea(ALL)}>{t('mapLibrary.allAreas')}</FilterChip>
            {areas.map((a) => (
              <FilterChip key={a} pressed={area === a} count={seeds.filter((s) => s.area === a).length} onClick={() => setArea(a)}>
                {areaLabel(a)}
              </FilterChip>
            ))}
          </div>
          <div role="group" aria-label={t('mapLibrary.level')} className="flex flex-wrap gap-2.5">
            <FilterChip pressed={level === ALL} onClick={() => setLevel(ALL)}>{t('mapLibrary.allLevels')}</FilterChip>
            {[1, 2, 3].map((n) => (
              <FilterChip key={n} pressed={level === String(n)} onClick={() => setLevel(String(n))}>{t('mapLibrary.levelN', { n })}</FilterChip>
            ))}
          </div>
          {shown.length === 0 ? <p className="m-0 text-muted">{t('mapLibrary.empty')}</p> : (
            <ul className="m-0 grid list-none grid-cols-1 gap-[22px] p-0 md:grid-cols-2 xl:grid-cols-3">
              {shown.map((s) => (
                <li key={s.id}>
                  <SeedMapCard seed={s} areaLabel={areaLabel(s.area)} copying={copyingId === s.id} onCopy={() => void copy(s.id)} />
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