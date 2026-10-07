import Link from 'next/link';
import { withStrings } from '@remoa/strings';
import * as more from '@remoa/strings/ns';
import { buttonVariants, focusRing } from '@remoa/ui';
import { Disclaimer, Provenance, SeedBadges, type Seed } from './library-view';
import { SeedCardBody, type SeedCardData } from './card-didactics';

const t = withStrings({ boards: more.boards, mapLibrary: more.mapLibrary });
type StringKey = Parameters<typeof t>[0];

export type PublicSeed = Omit<Seed, 'id'> & { slug: string };
export type PublicSeedDetail = PublicSeed & { sample: SeedCardData[] };

export const SAMPLE_SIZE = 10;
const IN_APP = '/app/mapas?aba=biblioteca';
const stats = (s: PublicSeed) =>
  [t(`boards.area.${s.area}` as StringKey), t('mapLibrary.cards', { n: s.cardCount }), t('mapLibrary.minutes', { n: s.estimatedMinutes }), t('mapLibrary.version', { v: s.contentVersion ?? s.version }), s.temporalMark ? t('mapLibrary.mark', { mark: s.temporalMark }) : null].filter(Boolean).join(' · ');
const cta = `inline-flex min-h-12 items-center rounded-btn px-5 font-display text-[15px] ${buttonVariants.primary} ${focusRing}`;

export function PublicSeedList({ seeds }: { seeds: PublicSeed[] }) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-10">
      <h1 className="m-0 font-display text-3xl font-extrabold">{t('mapLibrary.publicTitle')}</h1>
      <p className="m-0 text-muted">{t('mapLibrary.publicLead')}</p>
      {seeds.length === 0 ? <p className="m-0 text-muted">{t('mapLibrary.publicNone')}</p> : (
        <ul className="m-0 flex list-none flex-col gap-3 p-0">
          {seeds.map((s) => (
            <li key={s.slug} className="flex flex-col gap-2 rounded-3xl border border-border bg-surface p-4">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="m-0 text-lg font-bold">
                  <Link href={`/mapas-prontos/${s.slug}`} className="text-text hover:underline">{s.title}</Link>
                </h2>
                <SeedBadges badges={s.badges} />
              </div>
              <p className="m-0 text-sm text-muted">{stats(s)}</p>
              <Provenance seed={s} />
            </li>
          ))}
        </ul>
      )}
      <Disclaimer />
    </div>
  );
}

export function PublicSeedPage({ seed }: { seed: PublicSeedDetail }) {
  const next = encodeURIComponent(IN_APP);
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-10">
      <Link href="/mapas-prontos" className="inline-flex min-h-11 items-center font-semibold text-primary-deep">{t('mapLibrary.allMaps')}</Link>
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="m-0 font-display text-3xl font-extrabold">{seed.title}</h1>
        <SeedBadges badges={seed.badges} />
      </div>
      <p className="m-0 text-sm text-muted">{stats(seed)}</p>
      <Provenance seed={seed} />
      <div className="flex flex-wrap items-center gap-3">
        <Link href={`/cadastro?next=${next}`} className={cta}>{t('mapLibrary.useCta')}</Link>
        <Link href={`/entrar?next=${next}`} className="inline-flex min-h-11 items-center font-semibold text-primary-deep">{t('mapLibrary.signIn')}</Link>
      </div>
      <Disclaimer />
      <section aria-labelledby="seed-sample" className="flex flex-col gap-3">
        <h2 id="seed-sample" className="m-0 text-lg font-bold">{t('mapLibrary.sampleHeading')}</h2>
        <p className="m-0 text-sm text-muted">{t('mapLibrary.sampleNote', { n: SAMPLE_SIZE })}</p>
        <ol className="m-0 flex list-none flex-col gap-3 p-0">
          {seed.sample.map((c) => (
            <li key={c.title} className="flex flex-col gap-2 rounded-3xl border border-border bg-surface p-4"><SeedCardBody card={c} /></li>
          ))}
        </ol>
      </section>
    </div>
  );
}
