'use client';

import { strings } from '@remoa/strings/landing';
import { Section } from '@remoa/ui';
import { track } from '@/lib/analytics';
import { useDemoPlayer } from '../use-demo';
import '../demos.css';
import { CalendarPlayer } from './calendar-player';

const c = strings.landing.calendar;
const stepOn = ['calOn1', 'calOn2', 'calOn3'];
const kindTone = [
  'bg-[#FFEDD5] text-[#9A3412]',
  'bg-[#FEF3C7] text-[#854D0E]',
  'bg-[#F3F2FB] text-primary-deep',
  'bg-[#CCFBF1] text-[#0F766E]',
  'bg-[#EEEDF6] text-muted',
];
const kindDot = ['bg-[#C2410C]', 'bg-[#CA8A04]', 'bg-primary', 'bg-[#0F766E]', 'bg-[#8F8AAE]'];

export function CalendarSection() {
  const demo = useDemoPlayer(() => track('calendar_demo_viewed', {}));
  return (
    <Section id="calendario" eyebrow={c.eyebrow} title={c.title} lead={c.lead}>
      <div ref={demo.root} className="lp-cal grid items-start gap-8 lg:grid-cols-12 lg:gap-10">
        <div className="order-2 lg:order-1 lg:col-span-7">
          <CalendarPlayer playerRef={demo.player} />
        </div>
        <div className="order-1 flex flex-col gap-3.5 lg:order-2 lg:col-span-5">
          <ol className="m-0 flex list-none flex-col gap-3.5 p-0">
            {c.steps.map((step, i) => (
              <li key={step.title} className="relative flex items-start gap-4 rounded-3xl border-[1.5px] border-border bg-surface px-5 py-[18px]">
                <span className={`stepGlow k ${stepOn[i]} pointer-events-none absolute inset-0 rounded-3xl border-[1.5px] border-primary bg-[#F3F2FB]`} aria-hidden />
                <span className="relative z-[1] flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary font-display text-lg font-extrabold text-white">{i + 1}</span>
                <span className="relative z-[1] flex flex-col gap-0.5">
                  <span className="font-display text-xl font-extrabold tracking-[-0.02em]">{step.title}</span>
                  <span className="text-[15px] leading-normal text-muted">{step.text}</span>
                </span>
              </li>
            ))}
          </ol>
          <div className="flex flex-col gap-3 rounded-3xl border border-border bg-surface px-5 py-5">
            <span className="text-[15px] font-extrabold">{c.kindsTitle}</span>
            <div className="flex flex-wrap gap-2">
              {c.kinds.map((kind, i) => (
                <span key={kind} className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[13.5px] font-extrabold ${kindTone[i]}`}>
                  <i className={`h-[9px] w-[9px] rounded-full ${kindDot[i]}`} />
                  {kind}
                </span>
              ))}
            </div>
            <span className="text-sm text-muted">{c.kindsNote}</span>
          </div>
        </div>
      </div>
    </Section>
  );
}
