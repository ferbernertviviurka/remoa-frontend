'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { withStrings } from '@remoa/strings';
import * as more from '@remoa/strings/ns';
import { Button, Card, Tag } from '@remoa/ui';
import { api } from '@/lib/api';
import { SeedDetailSkeleton } from '@/features/shell/skeletons';
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
  const { copy, copyingId, error } = useSeedCopy();
  useEffect(() => {
    void api<Seed & { cards: SeedCard[] }>(`/v1/editorial/seeds/${id}`).then((r) => (r.ok ? setSeed(r.data) : setFailed(true)));
  }, [id]);
  if (failed) return <p role="alert" className="m-0 font-semibold text-review">{t('mapLibrary.loadError')}</p>;
  if (!seed) return <SeedDetailSkeleton />;
  const meta = [t(`boards.area.${seed.area}` as StringKey), t('mapLibrary.cards', { n: seed.cardCount }), t('mapLibrary.minutes', { n: seed.estimatedMinutes }), t('mapLibrary.version', { v: seed.contentVersion ?? seed.version }), seed.temporalMark ? t('mapLibrary.mark', { mark: seed.temporalMark }) : null].filter(Boolean).join(' · ');
  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 md:px-6 md:py-[13px]">
      <Link href="/app/mapas?aba=biblioteca" className="inline-flex min-h-11 w-fit items-center text-sm font-semibold text-primary-deep">{t('mapLibrary.back')}</Link>
      <div className="flex flex-col gap-4 border-b border-border pb-6 md:flex-row md:items-end md:justify-between">
        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Tag tone="unknown">{t(`boards.area.${seed.area}` as StringKey)}</Tag>
            <SeedBadges badges={seed.badges} />
          </div>
          <h1 className="m-0 font-display text-[34px] font-extrabold leading-[1.1] tracking-[-0.035em] text-ink md:text-[42px]">{seed.title}</h1>
          <p className="m-0 text-[15px] text-muted">{meta}</p>
          <Provenance seed={seed} />
          <p className="m-0 text-sm text-muted">{t('mapLibrary.readOnly')}</p>
        </div>
        <div className="flex shrink-0 flex-col gap-2">
          {error ? <p role="alert" className="m-0 text-sm font-semibold text-review">{t('mapLibrary.useError')}</p> : null}
          <Button loading={copyingId === seed.id} loadingLabel={t('mapLibrary.using')} disabled={copyingId !== null} onClick={() => void copy(seed.id)}>
            {t('mapLibrary.use')}
          </Button>
        </div>
      </div>
      <Disclaimer />
      <section aria-labelledby="seed-cards" className="flex flex-col gap-4">
        <h2 id="seed-cards" className="m-0 font-display text-2xl font-extrabold tracking-[-0.02em]">{t('mapLibrary.cardsHeading')}</h2>
        <ol className="m-0 flex list-none flex-col gap-4 p-0">
          {seed.cards.map((c, i) => (
            <li key={c.id}>
              <Card radius="list">
                <div className="flex flex-col gap-3">
                  <span className="text-xs font-bold uppercase tracking-[.12em] text-muted">{t('mapLibrary.trail')} · {c.pathOrder ?? i + 1}</span>
                  <SeedCardBody card={c} />
                  <div><ReportButton cardId={c.id} /></div>
                </div>
              </Card>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
