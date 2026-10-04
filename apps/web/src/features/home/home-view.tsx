import Link from 'next/link';
import type { ReactNode } from 'react';
import type { ActivationItem, BoardSummary, CoverageRow, HomeSummary } from '@remoa/contracts';
import { t, type StringKey } from '@remoa/strings';
import { Constellation, Hero, Icon, type IconName } from '@remoa/ui';
import { toConstellation } from './constellation';
import { eyebrowDate, hourIn, salutationKey, todayIso, weekdayName } from './format';
import { MapSlider } from './slider/map-slider';
import { ActivationChecklist } from '@/features/onboarding/activation-checklist';
import { GoButton, HeroActions, HomeHeaderActions } from './home-actions';

export type FirstInQueue = { title: string; pct: number };
export type HomeViewProps = { now: Date; summary: HomeSummary; boards: BoardSummary[]; coverage: CoverageRow[]; first?: FirstInQueue; queueStart?: ReactNode; checklist?: ActivationItem[] };

const h2 = 'm-0 font-display font-extrabold';
const panel = 'flex flex-col rounded-[28px] border border-border bg-surface';
const dayKeys = ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'] as const;

function Panel({ id, title, children, size = 'sm', aside }: { id: string; title: string; children: ReactNode; size?: 'sm' | 'lg'; aside?: ReactNode }) {
  return (
    <section aria-labelledby={id} className={`${panel} ${size === 'lg' ? 'gap-[18px] px-5 py-5 md:px-7 md:py-[26px]' : 'gap-4 p-5 md:p-[22px]'}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id={id} className={`${h2} ${size === 'lg' ? 'text-[22px] tracking-[-0.025em] md:text-[26px]' : 'text-[22px] tracking-[-0.02em]'}`}>{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

function Week({ summary, today }: { summary: HomeSummary; today: string }) {
  const total = (d: HomeSummary['week'][number]) => d.done + (d.date === today ? summary.dueToday : d.planned);
  const unit = 96 / Math.max(1, ...summary.week.map(total));
  return (
    <>
      <div className="flex items-end gap-2">
        {summary.week.map((d, i) => {
          const isToday = d.date === today;
          const future = d.date > today;
          const planned = isToday ? summary.dueToday : future ? d.planned : 0;
          const h = (n: number) => (n > 0 ? Math.max(8, Math.round(n * unit)) : 0);
          const label = t('home.weekBarLabel', { dia: t(`home.weekDays.${dayKeys[i]!}`), done: d.done, planned });
          return (
            <div key={d.date} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
              <div role="img" aria-label={label} className="flex h-24 w-full max-w-[30px] flex-col justify-end gap-0.5">
                {future && planned === 0 ? <span className="block h-3 w-full rounded-lg border-2 border-dashed border-border-strong" /> : null}
                {planned > 0 ? <span style={{ height: h(planned) }} className="box-border block w-full rounded-lg border-2 border-dashed border-primary bg-primary-tint" /> : null}
                {d.done > 0 ? <span style={{ height: h(d.done) }} className="block w-full rounded-lg bg-primary" /> : null}
              </div>
              <span aria-hidden="true" className={`text-xs ${isToday ? 'font-extrabold text-ink' : 'font-semibold text-muted'}`}>{t(`home.weekDays.${dayKeys[i]!}`)}</span>
            </div>
          );
        })}
      </div>
      <div className="flex gap-4 text-xs text-muted">
        <span className="flex items-center gap-1.5"><span aria-hidden="true" className="block size-3 rounded bg-primary" />{t('home.done')}</span>
        <span className="flex items-center gap-1.5"><span aria-hidden="true" className="box-border block size-3 rounded border-2 border-dashed border-border-strong" />{t('home.planned')}</span>
      </div>
    </>
  );
}

const shortcuts: { key: 'pdf' | 'anki' | 'seed'; icon: IconName; title: StringKey; desc: StringKey }[] = [
  { key: 'pdf', icon: 'file', title: 'home.generatePdf', desc: 'home.generatePdfDesc' },
  { key: 'anki', icon: 'archive', title: 'home.importAnki', desc: 'home.importAnkiDesc' },
  { key: 'seed', icon: 'book', title: 'home.seedMap', desc: 'home.seedMapDesc' },
];

function coverageByArea(rows: CoverageRow[]) {
  const acc = new Map<string, { cards: number; target: number }>();
  for (const r of rows) {
    const a = acc.get(r.area) ?? { cards: 0, target: 0 };
    acc.set(r.area, { cards: a.cards + r.cards, target: a.target + r.targetCards });
  }
  return [...acc].map(([area, v]) => ({ area, pct: Math.min(100, Math.round((v.cards / Math.max(1, v.target)) * 100)) }));
}

export function HomeView({ now, summary, boards, coverage, first, queueStart, checklist }: HomeViewProps) {
  const saudacao = t(`home.salutation.${salutationKey(hourIn(now))}`);
  const due = summary.dueToday;
  const dueBoards = boards.filter((b) => b.dueCount > 0).sort((a, b) => b.dueCount - a.dueCount);
  const top = dueBoards[0];
  const recent = [...boards].sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt));
  const live = top ?? recent[0];
  const greeting = boards.length === 0 ? t('home.greetingNoMaps', { saudacao }) : due > 0 ? t('home.greetingDue', { saudacao, n: due }) : t('home.greetingNone', { saudacao });
  const rows = coverageByArea(coverage);
  const today = todayIso(now);
  const progressMax = summary.reviewedToday + due;
  const heroText =
    due > 0 && top
      ? { title: t('home.reviewSummary', { boards: dueBoards.length, n: due }), description: first ? t('home.queueStart', { card: first.title, pct: first.pct }) : queueStart }
      : boards.length === 0
        ? { title: t('home.noMapsTitle'), description: t('home.noMapsBody') }
        : { title: t('home.reviewEmptyTitle'), description: t('home.reviewEmptyBody') };

  return (
    // -m cancela o padding do shell (p-4/md:p-6): o Hoje usa 36/48 do mock.
    <div className="-m-4 box-border flex flex-col gap-7 px-4 py-6 md:-m-6 md:px-12 md:pb-12 md:pt-9">
      <div className="flex flex-wrap items-end justify-between gap-4 md:gap-6">
        <div className="flex flex-col gap-2">
          <span className="text-xs font-bold uppercase leading-normal tracking-[.12em] text-muted">{eyebrowDate(now)}</span>
          <h1 className="m-0 max-w-[780px] font-display text-[30px] font-extrabold leading-[1.1] tracking-[-0.035em] md:text-[46px] md:leading-[1.05]">{greeting}</h1>
        </div>
        <HomeHeaderActions mapCount={boards.length} />
      </div>
      <div className="grid items-start gap-7 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-7">
          <ActivationChecklist items={checklist ?? []} />
          <Hero
            eyebrow={t('home.reviewSection')}
            title={heroText.title}
            description={heroText.description}
            progress={progressMax > 0 ? { value: summary.reviewedToday, max: progressMax, title: t('home.reviewedTitle', { n: summary.reviewedToday, total: progressMax }), caption: t('home.reviewedCaption') } : undefined}
            actions={
              due > 0 && top ? (
                <HeroActions only={dueBoards.length > 1 ? { id: top.id, title: top.title } : undefined} />
              ) : boards.length === 0 ? (
                <GoButton variant="light" href="/app/mapas/novo" label={t('library.newMapButton')} />
              ) : (
                <GoButton variant="light" href="/app/mapas" label={t('home.openMaps')} />
              )
            }
          >
            <Constellation {...toConstellation(live)} />
          </Hero>
          <MapSlider maps={boards} />
          <Panel id="home-cov" size="lg" title={t('home.coverage')} aside={<span className="text-[13px] text-muted">{t('home.coverageHint')}</span>}>
            {rows.length === 0 ? (
              <p className="m-0 text-muted">{t('home.coverageEmpty')}</p>
            ) : (
              rows.map((r) => (
                <div key={r.area} className="grid grid-cols-[minmax(0,1fr)_52px] items-center gap-x-4 gap-y-2 sm:grid-cols-[minmax(0,210px)_minmax(0,1fr)_52px]">
                  <span className="font-semibold">{t(`boards.area.${r.area as 'CM'}`)}</span>
                  <span className="order-last col-span-2 block h-3 overflow-hidden rounded-md bg-track sm:order-none sm:col-span-1" role="img" aria-label={`${r.pct}%`}>
                    <span style={{ width: `${r.pct}%` }} className="block h-3 rounded-md bg-primary" />
                  </span>
                  <span className="text-right font-display text-lg font-extrabold">{r.pct}%</span>
                </div>
              ))
            )}
          </Panel>
        </div>
        <aside aria-label={t('home.weekTitle')} className="flex min-w-0 flex-col gap-5">
          <Panel id="home-week" title={t('home.weekTitle')} aside={<span className="rounded-pill bg-primary-tint px-3 py-1 text-[13px] font-bold text-primary-deep">{t('home.weekStreak', { n: summary.streakDays })}</span>}>
            <Week summary={summary} today={today} />
          </Panel>
          <section aria-labelledby="home-next" className={`${panel} gap-1 px-[22px] pb-3 pt-[22px]`}>
            <h2 id="home-next" className={`${h2} mb-2 text-[22px] tracking-[-0.02em]`}>{t('home.nextReviewsTitle')}</h2>
            {summary.upcoming.map((u, i) => (
              <div key={u.date} className="flex items-center justify-between border-t border-track py-2.5">
                <span className="font-semibold">{i === 0 ? t('home.nextReviews.today') : i === 1 ? t('home.nextReviews.tomorrow') : weekdayName(u.date)}</span>
                <span className="font-display text-lg font-extrabold">{u.count}</span>
              </div>
            ))}
          </section>
          <section aria-labelledby="home-new" className={`${panel} gap-3 p-[22px]`}>
            <h2 id="home-new" className={`${h2} mb-0.5 text-[22px] tracking-[-0.02em]`}>{t('home.startSomething')}</h2>
            {shortcuts.map((s) => (
              <Link key={s.key} href={`/app/mapas/novo?caminho=${s.key}`} className="lift flex items-center gap-3.5 rounded-[18px] bg-canvas p-3 text-ink no-underline">
                <span aria-hidden="true" className="flex size-11 items-center justify-center rounded-[14px] bg-primary-tint text-primary-deep"><Icon name={s.icon} size={22} /></span>
                <span className="flex flex-col leading-[1.3]">
                  <span className="font-bold">{t(s.title)}</span>
                  <span className="text-[13px] text-muted">{t(s.desc)}</span>
                </span>
              </Link>
            ))}
            <Link href="/app/indicar?de=home" className="lift flex items-center gap-3.5 rounded-[18px] bg-canvas p-3 text-ink no-underline">
              <span aria-hidden="true" className="flex size-11 items-center justify-center rounded-[14px] bg-primary-tint text-primary-deep"><Icon name="gift" size={22} /></span>
              <span className="flex flex-col leading-[1.3]">
                <span className="font-bold">{t('referral.homeCard')}</span>
                <span className="text-[13px] text-muted">{t('referral.homeCardDesc')}</span>
              </span>
            </Link>
          </section>
        </aside>
      </div>
    </div>
  );
}
