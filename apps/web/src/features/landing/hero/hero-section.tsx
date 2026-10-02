import type { CSSProperties } from 'react';
import { t } from '@remoa/strings';
import { Icon } from '@remoa/ui';
import type { LandingFlags } from '../flags';
import type { H1Variant } from '../shell/variants';
import { HeroCtas } from './hero-ctas';
import { HeroStage } from './hero-stage';

const d = (s: number) => ({ '--d': `${s}s` }) as CSSProperties;

/** The H1 with the drawn bar under the "conex…" word (variants a and b); variant c has no such word, so no bar. */
function Title({ text }: { text: string }) {
  const m = /conex\p{L}*/u.exec(text);
  if (!m) return <>{text}</>;
  return (
    <>
      {text.slice(0, m.index)}
      <span className="relative isolate inline-block">
        {m[0]}
        <span aria-hidden="true" className="hx-bar absolute -inset-x-0.5 bottom-[.06em] -z-10 h-[.26em] rounded-md bg-border-strong" />
      </span>
      {text.slice(m.index + m[0].length)}
    </>
  );
}

/** F16 FR-3/FR-4: landing hero (server component). The only h1 on the page. */
export function HeroSection({ h1, flags }: { h1: H1Variant; flags: LandingFlags }) {
  return (
    <section id="topo" aria-labelledby="hero-title" className="relative overflow-x-clip pt-12 md:pt-[72px]">
      <div className="mx-auto flex w-full max-w-[1280px] flex-col items-center gap-6 px-4 text-center md:px-10">
        <span className="hx-in flex h-[38px] items-center gap-2 rounded-pill border border-border-strong bg-surface pl-3 pr-4 text-sm font-bold text-primary-deep" style={d(0)}>
          <span className="flex text-primary"><Icon name="sparkle" size={18} /></span>
          {t('landing.hero.tag')}
        </span>
        <h1 id="hero-title" className="hx-in m-0 max-w-[1060px] font-display text-[44px] font-extrabold leading-[1.02] tracking-[-.04em] text-ink md:text-[64px] lg:text-[80px]" style={d(0.1)}>
          <Title text={t(`landing.hero.h1.${h1}`)} />
        </h1>
        <p className="hx-in m-0 max-w-[740px] text-[17px] leading-normal text-muted md:text-[21px]" style={d(0.25)}>{t('landing.hero.subtitle')}</p>
        <HeroCtas launchPhase={flags.launchPhase} />
        <span className="hx-in text-sm text-muted" style={d(0.4)}>{t('landing.hero.microcopy')}</span>
      </div>
      <HeroStage flags={flags} />
    </section>
  );
}
