'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { withStrings } from '@remoa/strings';
import * as more from '@remoa/strings/ns';
import { Button } from '@remoa/ui';
import { api } from '@/lib/api';
import { Disclaimer, Provenance, SeedBadges, useSeedCopy, type Seed } from './library-view';
import { SeedCardBody, type SeedCardData } from './card-didactics';
import { ReportButton } from './report-button';

const t = withStrings({ boards: more.boards, mapLibrary: more.mapLibrary });
type StringKey = Parameters<typeof t>[0];

type SeedCard = SeedCardData & { id: string; pathOrder: number | null };

/** FR-37 "Ver": the original map, read only, in trail order; each card carries "Reportar erro". */
export function SeedDetailView({ id }: { id: string }) {
  const [seed, setSeed] = useState<(Seed & { cards: SeedCard[] }) | null>(null);
  const [failed, setFailed] = useState(false);
  const { copy, busy, error } = useSeedCopy();
  useEffect(() => {
    void api<Seed & { cards: SeedCard[] }>(`/v1/editorial/seeds/${id}`).then((r) => (r.ok ? setSeed(r.data) : setFailed(true)));
  }, [id]);
  if (failed) return <p role="alert" className="m-0 font-semibold text-review">{t('mapLibrary.loadError')}</p>;
  if (!seed) return <p className="m-0 text-muted">{t('common.loading')}</p>;
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <Link href="/app/mapas?aba=biblioteca" className="inline-flex min-h-11 items-center font-semibold text-primary-deep">{t('mapLibrary.back')}</Link>
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="m-0 font-display text-3xl font-extrabold">{seed.title}</h1>
        <SeedBadges badges={seed.badges} />
      </div>
      <p className="m-0 text-sm text-muted">
        {[t(`boards.area.${seed.area}` as StringKey), t('mapLibrary.cards', { n: seed.cardCount }), t('mapLibrary.minutes', { n: seed.estimatedMinutes }), t('mapLibrary.version', { v: seed.contentVersion ?? seed.version }), seed.temporalMark ? t('mapLibrary.mark', { mark: seed.temporalMark }) : null].filter(Boolean).join(' · ')}
      </p>
      <Provenance seed={seed} />
      <p className="m-0 text-muted">{t('mapLibrary.readOnly')}</p>
      {error ? <p role="alert" className="m-0 text-sm font-semibold text-review">{t('mapLibrary.useError')}</p> : null}
      <div><Button disabled={busy} onClick={() => void copy(seed.id)}>{t(busy ? 'mapLibrary.using' : 'mapLibrary.use')}</Button></div>
      <Disclaimer />
      <section aria-labelledby="seed-cards" className="flex flex-col gap-3">
        <h2 id="seed-cards" className="m-0 text-lg font-bold">{t('mapLibrary.cardsHeading')}</h2>
        <ol className="m-0 flex list-none flex-col gap-3 p-0">
          {seed.cards.map((c) => (
            <li key={c.id} className="flex flex-col gap-2 rounded-3xl border border-border bg-surface p-4">
              <SeedCardBody card={c} />
              <div><ReportButton cardId={c.id} /></div>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
