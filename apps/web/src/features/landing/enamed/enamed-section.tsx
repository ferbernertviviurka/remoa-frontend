'use client';

import { strings } from '@remoa/strings/landing';
import { EnamedCta, EnamedSlider } from './enamed-slider';
import type { EnamedSlide } from './slides';

const e = strings.landing.enamed;

export function EnamedSection({ slides }: { slides: EnamedSlide[] }) {
  return (
    <section id="enamed" aria-labelledby="enamed-title" className="scroll-mt-[92px] px-4 pt-16 md:px-10 md:pt-24">
      <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-12">
        <div className="flex flex-wrap items-center justify-between gap-7 rounded-[36px] bg-panel-dark px-8 py-8 text-on-dark md:px-10 md:py-9">
          <div className="flex max-w-[760px] flex-col gap-2">
            <span className="inline-flex w-fit items-center gap-2 self-start rounded-full bg-[#5EEAD4] px-3.5 py-1 text-xs font-extrabold text-[#134E4A]">
              <i className="h-2 w-2 rounded-full bg-[#0F766E]" aria-hidden />
              {e.badge}
            </span>
            <h2 id="enamed-title" className="m-0 font-display text-[32px] leading-tight font-extrabold tracking-[-0.035em] md:text-[38px]">{e.title}</h2>
            <p className="m-0 text-[17px] leading-normal text-on-dark-muted">{e.lead}</p>
          </div>
          <EnamedCta />
        </div>
        <EnamedSlider slides={slides} />
        <p className="m-0 text-center text-[13.5px] leading-normal text-muted">{e.note}</p>
      </div>
    </section>
  );
}
