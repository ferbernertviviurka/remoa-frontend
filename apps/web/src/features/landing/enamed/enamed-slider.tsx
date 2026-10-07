'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { strings, t } from '@remoa/strings/landing';
import { LazyMorph, buttonVariants, focusRing } from '@remoa/ui';
import { track } from '@/lib/analytics';
import type { EnamedSlide, EnamedTone } from './slides';

const e = strings.landing.enamed;
const toneClass: Record<EnamedTone, string> = {
  cm: 'bg-[#E4DFF8] text-primary-deep',
  sc: 'bg-[#CCFBF1] text-[#0F766E]',
  mfc: 'bg-[#E0E7FF] text-[#3730A3]',
  ped: 'bg-[#FCE7F3] text-[#9D174D]',
};
const dotFill = ['bg-primary', 'bg-[#CA8A04]', 'bg-[#C2410C]', 'bg-[#B8B3D0]'];

function EnamedIntro() {
  return (
    <div className="flex max-w-[760px] flex-col gap-2">
      <span className="text-xs font-bold tracking-[0.12em] text-muted uppercase">{e.eyebrow}</span>
      <h3 className="m-0 font-display text-[32px] leading-tight font-extrabold tracking-[-0.035em] md:text-[40px]">{e.heading}</h3>
      <p className="m-0 text-[17px] leading-normal text-muted">{e.support}</p>
    </div>
  );
}

export function EnamedCta() {
  return (
    <Link href="/mapas-prontos" onClick={() => track('enamed_cta_clicked', {})} className={`inline-flex h-[58px] items-center gap-2 rounded-[17px] px-7 text-[17px] no-underline ${buttonVariants.light} ${focusRing}`}>
      {e.cta}
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M5 12h14M13 6l6 6-6 6" /></svg>
    </Link>
  );
}

/**
 * Native scroll-snap track: swipe, trackpad and the arrows all move the same scroll, and the counter follows it.
 * Mobile shows 1.12 cards (89% basis; the peek invites the swipe); ≥ 768 px shows 3.
 */
export function EnamedSlider({ slides }: { slides: EnamedSlide[] }) {
  const track$ = useRef<HTMLDivElement>(null);
  const [at, setAt] = useState(0);
  const [end, setEnd] = useState(false);
  const [armed, setArmed] = useState(false);
  const total = slides.length;

  const read = () => {
    const el = track$.current;
    const step = (el?.firstElementChild as HTMLElement | null)?.offsetWidth;
    if (!el || !step) return;
    const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;
    setEnd(atEnd);
    setAt(atEnd ? total - 1 : Math.round(el.scrollLeft / step));
  };
  useEffect(read, [total]);

  const go = (dir: 1 | -1) => {
    const el = track$.current;
    const step = (el?.firstElementChild as HTMLElement | null)?.offsetWidth;
    if (!el || !step) return;
    setArmed(true);
    el.scrollBy({ left: dir * step, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    track('enamed_slider_used', { control: dir > 0 ? 'next' : 'prev' });
  };
  if (total === 0) {
    return (
      <div>
        <EnamedIntro />
        <p className="m-0 text-muted">{e.empty}</p>
      </div>
    );
  }
  return (
    <div>
      <div className="mb-6 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <EnamedIntro />
        <div className="flex items-center justify-end gap-3.5 md:ml-auto">
          <span aria-live="polite" className="text-right text-[14.5px] font-bold text-muted tabular-nums">
            <LazyMorph armed={armed}>{t('landing.enamed.counter', { n: at + 1, total })}</LazyMorph>
          </span>
          <Arrow label={e.prev} disabled={at === 0} onClick={() => go(-1)} dir="prev" />
          <Arrow label={e.next} disabled={end} onClick={() => go(1)} dir="next" />
        </div>
      </div>
      <div
        ref={track$}
        role="region"
        aria-roledescription={e.carousel}
        aria-label={e.region}
        tabIndex={0}
        onScroll={() => { setArmed(true); read(); }}
        onKeyDown={(ev) => {
          if (ev.key === 'ArrowRight') { ev.preventDefault(); go(1); }
          if (ev.key === 'ArrowLeft') { ev.preventDefault(); go(-1); }
        }}
        className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain rounded-[34px] [scrollbar-width:none] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary [&::-webkit-scrollbar]:hidden"
      >
          {slides.map((slide, i) => (
            <article
              key={slide.slug}
              role="group"
              aria-roledescription={e.slide}
              aria-label={t('landing.enamed.slideLabel', { n: i + 1, total })}
              className="box-border flex h-[420px] shrink-0 basis-[89%] snap-start flex-col gap-3 px-2.5 md:basis-1/3"
            >
              <div className="flex h-full flex-col gap-3 rounded-[32px] border border-border bg-surface px-6 py-6 shadow-[0_18px_44px_rgba(36,26,92,0.08)]">
                <div className="flex items-center justify-between gap-2.5">
                  <span className="font-display text-[46px] leading-none font-extrabold tracking-[-0.05em] text-primary">{String(i + 1).padStart(2, '0')}</span>
                  <span className={`rounded-full px-3 py-1 text-right text-xs font-extrabold ${toneClass[slide.tone]}`}>{slide.areaLabel}</span>
                </div>
                <h4 className="m-0 font-display text-[25px] leading-tight font-extrabold tracking-[-0.025em]">
                  <Link href={`/mapas-prontos/${slide.slug}`} className="no-underline hover:underline">{slide.title}</Link>
                </h4>
                <p className="m-0 text-[15.5px] leading-normal text-muted">{slide.blurb}</p>
                <MapThumb index={i} />
                <div className="flex flex-wrap gap-1.5">
                  {e.tags.map((tag) => <span key={tag} className="rounded-full bg-[#F3F2FB] px-2.5 py-0.5 text-[11.5px] font-extrabold text-primary-deep">{tag}</span>)}
                </div>
              </div>
            </article>
          ))}
      </div>
    </div>
  );
}

function Arrow({ label, disabled, onClick, dir }: { label: string; disabled: boolean; onClick: () => void; dir: 'prev' | 'next' }) {
  return (
    <button type="button" aria-label={label} disabled={disabled} onClick={onClick} className="inline-flex h-[52px] w-[52px] items-center justify-center rounded-full border-[1.5px] border-[#D9D4F0] bg-surface text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-40">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        {dir === 'prev' ? <path d="M19 12H5M11 6l-6 6 6 6" /> : <path d="M5 12h14M13 6l6 6-6 6" />}
      </svg>
    </button>
  );
}

function MapThumb({ index }: { index: number }) {
  const nodes = [
    [100, 43], [32, 19], [178, 17], [22, 77], [88, 85], [160, 73], [216, 47], [134, 3],
  ];
  return (
    <div className="relative mt-auto h-[118px] overflow-hidden rounded-[20px] border border-[#EEEBF8] bg-canvas" aria-hidden>
      <div className="absolute top-1/2 left-1/2 h-[110px] w-[260px] -translate-x-1/2 -translate-y-1/2">
        {nodes.map(([x, y], i) => (
          <span key={`${x}-${y}`} className={`absolute h-[15px] w-6 rounded-[5px] ${dotFill[(i + index) % dotFill.length]}`} style={{ left: x, top: y }} />
        ))}
      </div>
    </div>
  );
}
