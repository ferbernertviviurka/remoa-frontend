import { strings, t } from '@remoa/strings/full';
import { BentoTile, Marquee, ProgressLine, Reveal, Section, StepCard, Tag } from '@remoa/ui';
import type { LandingFlags } from '../flags';
import { RevealFallback } from './use-reveal-fallback';
import { ConnectThumb, CoverageThumb, EvolveThumb, LooseCardsThumb, RepeatThumb, ReviewThumb } from './thumbs';

const chip = 'flex h-12 items-center rounded-full border border-border bg-surface px-[22px] text-[15px] font-semibold whitespace-nowrap';

export function ReadyMarquee({ flags }: { flags?: Partial<LandingFlags> }) {
  const title = flags?.approvedContent ? t('landing.ready.titleApproved') : t('landing.ready.title');
  return (
    <section aria-labelledby="ready-title" className="overflow-hidden pt-16">
      <RevealFallback />
      <p id="ready-title" className="m-0 mb-5 text-center text-xs font-bold tracking-[0.12em] text-muted uppercase">{title}</p>
      <Marquee
        label={title}
        pauseLabel={t('landing.ready.pauseAria')}
        playLabel={t('landing.ready.playAria')}
        speedSeconds={38}
        items={strings.landing.ready.maps.map((m) => <span key={m} className={chip}>{m}</span>)}
      />
    </section>
  );
}

const problemThumbs = [LooseCardsThumb, RepeatThumb, CoverageThumb];

export function ProblemSection() {
  return (
    <Section id="problema" eyebrow={t('landing.problem.eyebrow')} title={t('landing.problem.title')}>
      <RevealFallback />
      <div className="grid gap-6 md:grid-cols-3">
        {strings.landing.problem.cards.map((c, i) => {
          const Thumb = problemThumbs[i]!;
          return (
            <Reveal key={c.title} delay={i * 80}>
              <article className="flex h-full flex-col gap-[18px] rounded-[32px] border border-border bg-surface p-[22px]">
                <Thumb chip={c.chip} />
                <div className="flex flex-col gap-2 px-1.5 pb-1.5">
                  <h3 className="m-0 font-display text-2xl font-extrabold tracking-[-0.025em]">{c.title}</h3>
                  <p className="m-0 text-base leading-[1.55] text-muted">{c.text}</p>
                </div>
              </article>
            </Reveal>
          );
        })}
      </div>
    </Section>
  );
}

const howThumbs = [ConnectThumb, ReviewThumb, EvolveThumb];

export function HowSection() {
  return (
    <Section id="como-funciona" eyebrow={t('landing.nav.anchors.howWorks')} title={t('landing.how.title')}>
      <RevealFallback />
      <ProgressLine />
      <div className="grid gap-8 md:grid-cols-3">
        {strings.landing.how.steps.map((s, i) => {
          const Thumb = howThumbs[i]!;
          return <StepCard key={s.num} number={s.num} title={s.title} text={s.text} thumbnail={<Thumb />} />;
        })}
      </div>
    </Section>
  );
}

const sample = { source: 'Surviving Sepsis Campaign 2021', milestone: 'Edição Enamed 2026', reviewer: '[Nome do revisor]', crm: '[00000]', version: 'v1.2' };

function ProvenanceRow({ label, children, last }: { label: string; children: React.ReactNode; last?: boolean }) {
  return (
    <div className={`flex items-center justify-between gap-4 py-4 ${last ? '' : 'border-b border-border'}`}>
      <span className="text-muted">{label}</span>
      <span className="text-right font-bold">{children}</span>
    </div>
  );
}

/** Real provenance UI (tile 4): source + temporal mark; reviewer/CRM only with the approved flag, otherwise the draft line (D-236). Values are sample placeholders, same as the mock. */
function Provenance({ approved }: { approved: boolean }) {
  return (
    <div className="flex flex-col rounded-[26px] bg-canvas px-[22px] py-1.5">
      <ProvenanceRow label={t('inspector.sourceLabel')}>{sample.source}</ProvenanceRow>
      <ProvenanceRow label={t('inspector.temporalLabel')}>{sample.milestone}</ProvenanceRow>
      {approved ? (
        <ProvenanceRow label={t('inspector.reviewerLabel')}>
          <Tag tone="steady">{t('landing.hero.chips.reviewed')}</Tag> {t('inspector.reviewerInfo', { revisor: sample.reviewer, crm: sample.crm })}
        </ProvenanceRow>
      ) : (
        <ProvenanceRow label={t('inspector.statusLabel')}><Tag tone="unknown">{t('landing.hero.map.provenanceDraft')}</Tag></ProvenanceRow>
      )}
      <ProvenanceRow label={t('inspector.version')} last>{sample.version}</ProvenanceRow>
    </div>
  );
}

const moreImgs = ['importar', 'prontos', 'celular'] as const;

export function MoreSection({ flags }: { flags?: Partial<LandingFlags> }) {
  const approved = !!flags?.approvedContent;
  const tiles = strings.landing.more.tiles.map((tile, i) => ({ tile, i })).filter(({ tile }) => approved || !('approvedOnly' in tile));
  const hidden = tiles.length < strings.landing.more.tiles.length;
  return (
    <Section id="mais" eyebrow={t('landing.more.eyebrow')} title={t('landing.more.title')}>
      <RevealFallback />
      <div className="grid gap-6 md:grid-cols-12">
        {tiles.map(({ tile, i }) => {
          const span = i === 0 ? 'md:col-span-7' : i === 3 ? (hidden ? 'md:col-span-12' : 'md:col-span-7') : 'md:col-span-5';
          const text = i === 3 && approved && 'textApproved' in tile ? tile.textApproved : tile.text;
          return (
            <div key={tile.title} className={span}>
              <BentoTile
                title={tile.title}
                text={text}
                dark={i === 2}
                image={i < 3 ? <img src={`/landing/feat-${moreImgs[i]}.svg`} alt={tile.alt} width={640} height={420} loading="lazy" /> : undefined}
              >
                {i === 3 ? <Provenance approved={approved} /> : null}
              </BentoTile>
            </div>
          );
        })}
      </div>
    </Section>
  );
}
